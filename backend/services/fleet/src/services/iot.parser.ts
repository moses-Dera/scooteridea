import { logger } from '@ebike/core';
import type { BikeTelemetryPayload } from '@ebike/types';

export class IoTParser {
  /**
   * Parses a raw hex string from a physical IoT tracker into standard JSON.
   *
   * Example Custom Protocol (16 bytes / 32 hex chars):
   * [0-3]  IMEI/BikeID Prefix (4 bytes)
   * [4-7]  Latitude Float32 (4 bytes)
   * [8-11] Longitude Float32 (4 bytes)
   * [12]   Battery percentage (1 byte)
   * [13]   Speed km/h (1 byte)
   * [14]   Lock Status: 0x01=Locked, 0x00=Unlocked (1 byte)
   * [15]   Reserved / Checksum (1 byte)
   */
  static parseHexPayload(
    hexString: string,
  ): { bikeId: string; payload: BikeTelemetryPayload } | null {
    try {
      // Remove spaces and normalize
      const cleanHex = hexString.replace(/\s+/g, '').toUpperCase();

      // Basic validation
      if (cleanHex.length < 32) {
        throw new Error(`Invalid payload length. Expected 32 hex chars, got ${cleanHex.length}`);
      }

      // Convert hex string to a Node.js Buffer for fast byte-level reads
      const buffer = Buffer.from(cleanHex, 'hex');

      // 1. Extract Bike IMEI/ID (bytes 0-3)
      const imeiInt = buffer.readUInt32BE(0);
      const bikeId = `bike-${imeiInt}`; // Convert to our internal ID format

      // 2. Extract Lat/Lng (bytes 4-7 and 8-11)
      const lat = buffer.readFloatBE(4);
      const lng = buffer.readFloatBE(8);

      // 3. Extract Battery & Speed (bytes 12, 13)
      const battery_pct = buffer.readUInt8(12);
      const speed_kmh = buffer.readUInt8(13);

      // 4. Extract Lock Status (byte 14)
      const lockByte = buffer.readUInt8(14);
      const lock_status = lockByte === 1 ? 'LOCKED' : 'UNLOCKED';

      const payload: BikeTelemetryPayload = {
        lat: Number(lat.toFixed(5)), // Round to 5 decimal places (~1 meter precision)
        lng: Number(lng.toFixed(5)),
        battery_pct,
        speed_kmh,
        lock_status,
        docked_at: null, // IoT physical tracker doesn't inherently know dock status without RFID/BLE handshake
      };

      return { bikeId, payload };
    } catch (error: any) {
      logger.error(
        { error: error.message, hexString },
        '[IoTParser] Failed to decode raw hex payload',
      );
      return null;
    }
  }
}
