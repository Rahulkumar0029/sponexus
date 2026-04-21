import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable");
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

// 🔐 Strict query mode
mongoose.set("strictQuery", true);

// 🔐 Better debug only in dev
if (process.env.NODE_ENV === "development") {
  mongoose.set("debug", true);
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string, {
      bufferCommands: false,

      // 🔥 SECURITY + STABILITY OPTIONS
      maxPoolSize: 10, // limit connections
      serverSelectionTimeoutMS: 5000, // fail fast if DB down
      socketTimeoutMS: 45000, // close inactive sockets
      connectTimeoutMS: 10000, // connection timeout
    });
  }

  try {
    cached.conn = await cached.promise;

    if (process.env.NODE_ENV === "development") {
      console.log("✅ MongoDB connected");
    }
  } catch (error) {
    cached.promise = null;

    console.error("❌ MongoDB connection failed:", error);
    throw new Error("Database connection failed");
  }

  return cached.conn;
}