import { PrismaClient } from "@prisma/client";
import path from "path";

// SQLite file path
const sqlitePath = path.resolve(__dirname, "./dev.db");

export const prisma = new PrismaClient({
  adapter: `file:${sqlitePath}`, // this replaces url in Prisma 7+
});