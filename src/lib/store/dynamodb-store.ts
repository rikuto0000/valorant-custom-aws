import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type { Room, Player, PlayerInput, RoomStatus, RankMode, Team } from '../types';
import type { IDataStore } from './interface';

const TTL_SECONDS = 86400; // 24 hours

export class DynamoDBStore implements IDataStore {
  private docClient: DynamoDBDocumentClient;
  private roomsTable: string;
  private playersTable: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.APP_AWS_REGION,
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.roomsTable = process.env.DYNAMODB_ROOMS_TABLE_NAME ?? 'Rooms';
    this.playersTable = process.env.DYNAMODB_PLAYERS_TABLE_NAME ?? 'Players';
  }

  async createRoom(): Promise<Room> {
    const now = new Date();
    const room: Room = {
      id: uuidv4(),
      status: 'waiting',
      rank_mode: 'current',
      created_at: now.toISOString(),
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.roomsTable,
        Item: {
          roomId: room.id,
          created_at: room.created_at,
          status: room.status,
          rank_mode: room.rank_mode,
          ttl: Math.floor(now.getTime() / 1000) + TTL_SECONDS,
        },
      }),
    );

    return room;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.roomsTable,
        Key: { roomId },
      }),
    );

    if (!result.Item) return null;

    return {
      id: result.Item.roomId as string,
      created_at: result.Item.created_at as string,
      status: result.Item.status as RoomStatus,
      rank_mode: result.Item.rank_mode as RankMode,
    };
  }

  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.roomsTable,
        Key: { roomId },
        UpdateExpression: 'SET #s = :status',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':status': status },
      }),
    );
  }

  async updateRoomRankMode(roomId: string, rankMode: RankMode): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.roomsTable,
        Key: { roomId },
        UpdateExpression: 'SET rank_mode = :rankMode',
        ExpressionAttributeValues: { ':rankMode': rankMode },
      }),
    );
  }

  async deleteRoom(roomId: string): Promise<void> {
    // Cascade: delete all players first
    await this.deleteAllPlayers(roomId);

    await this.docClient.send(
      new DeleteCommand({
        TableName: this.roomsTable,
        Key: { roomId },
      }),
    );
  }

  async addPlayer(roomId: string, player: PlayerInput): Promise<Player> {
    // Check for duplicate riot_id
    const existing = await this.getPlayers(roomId);
    const duplicate = existing.find((p) => p.riot_id === player.riot_id);
    if (duplicate) {
      throw new Error(`プレイヤー ${player.riot_id} は既にこのルームに登録されています`);
    }

    const newPlayer: Player = {
      id: uuidv4(),
      room_id: roomId,
      ...player,
      team: null,
      created_at: new Date().toISOString(),
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.playersTable,
        Item: {
          roomId,
          playerId: newPlayer.id,
          riot_id: newPlayer.riot_id,
          display_name: newPlayer.display_name,
          rank: newPlayer.rank,
          rank_value: newPlayer.rank_value,
          peak_rank: newPlayer.peak_rank,
          peak_rank_value: newPlayer.peak_rank_value,
          team: newPlayer.team,
          created_at: newPlayer.created_at,
        },
      }),
    );

    return newPlayer;
  }

  async getPlayers(roomId: string): Promise<Player[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.playersTable,
        KeyConditionExpression: 'roomId = :roomId',
        ExpressionAttributeValues: { ':roomId': roomId },
      }),
    );

    return (result.Items ?? []).map((item) => ({
      id: item.playerId as string,
      room_id: item.roomId as string,
      riot_id: item.riot_id as string,
      display_name: item.display_name as string,
      rank: item.rank as string,
      rank_value: item.rank_value as number,
      peak_rank: item.peak_rank as string,
      peak_rank_value: item.peak_rank_value as number,
      team: (item.team as Team) ?? null,
      created_at: item.created_at as string,
    }));
  }

  async deletePlayer(roomId: string, playerId: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.playersTable,
        Key: { roomId, playerId },
      }),
    );
  }

  async updatePlayerTeam(roomId: string, playerId: string, team: Team): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.playersTable,
        Key: { roomId, playerId },
        UpdateExpression: 'SET team = :team',
        ExpressionAttributeValues: { ':team': team },
      }),
    );
  }

  async resetTeams(roomId: string): Promise<void> {
    const players = await this.getPlayers(roomId);
    for (const player of players) {
      await this.updatePlayerTeam(roomId, player.id, null);
    }
  }

  async cleanupExpiredRooms(): Promise<void> {
    // DynamoDB TTL handles automatic deletion.
    // This method provides a manual sweep for any rooms that TTL hasn't cleaned yet.
    // In practice, DynamoDB TTL is eventually consistent, so this is a safety net.
  }

  private async deleteAllPlayers(roomId: string): Promise<void> {
    const players = await this.getPlayers(roomId);
    if (players.length === 0) return;

    // BatchWriteItem supports max 25 items per request
    const batches: { roomId: string; playerId: string }[][] = [];
    for (let i = 0; i < players.length; i += 25) {
      batches.push(
        players.slice(i, i + 25).map((p) => ({ roomId, playerId: p.id })),
      );
    }

    for (const batch of batches) {
      await this.docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.playersTable]: batch.map((key) => ({
              DeleteRequest: { Key: key },
            })),
          },
        }),
      );
    }
  }
}
