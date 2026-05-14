import {setGlobalOptions} from "firebase-functions";
import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

setGlobalOptions({maxInstances: 10});

export const submitMeasurement = onCall(async (request) => {
  const {
    deviceId,
    temperature,
    humidity,
    soilDry,
    heaterOn,
    fanOn,
    mist1On,
    mist2On,
    mode,
  } = request.data;

  if (!deviceId) {
    throw new Error("deviceId is required");
  }

  try {
    const measurement = {
      deviceId,
      timestamp: new Date(),
      temperature: temperature ?? 0,
      humidity: humidity ?? 0,
      soilDry: soilDry ?? false,
      heaterOn: heaterOn ?? false,
      fanOn: fanOn ?? false,
      mist1On: mist1On ?? false,
      mist2On: mist2On ?? false,
      mode: mode ?? "auto",
      temperatureStatus: "normal",
      humidityStatus: "normal",
    };

    const docRef = await db.collection("measurements").add(measurement);
    logger.info("Measurement saved", {deviceId, docId: docRef.id});

    return {success: true, id: docRef.id};
  } catch (error) {
    logger.error("Failed to save measurement", {error});
    throw new Error("Failed to save measurement");
  }
});

export const createCommand = onCall(async (request) => {
  const {deviceId, type, value} = request.data;
  const userId = request.auth?.uid;

  if (!deviceId || !type || !value) {
    throw new Error("deviceId, type, and value are required");
  }

  if (!userId) {
    throw new Error("Authentication required");
  }

  try {
    const command = {
      deviceId,
      type,
      value,
      status: "pending",
      createdAt: new Date(),
      createdBy: userId,
      executedAt: null,
      rejectedReason: null,
    };

    const docRef = await db.collection("commands").add(command);
    logger.info("Command created", {deviceId, type, docId: docRef.id});

    return {success: true, id: docRef.id};
  } catch (error) {
    logger.error("Failed to create command", {error});
    throw new Error("Failed to create command");
  }
});
