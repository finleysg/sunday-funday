import { MySqlContainer, type StartedMySqlContainer } from "@testcontainers/mysql";
import { execSync } from "node:child_process";

export interface TestMysql {
  container: StartedMySqlContainer;
  url: string;
  stop: () => Promise<void>;
}

export async function startTestMysql(): Promise<TestMysql> {
  const container = await new MySqlContainer("mysql:8.4")
    .withDatabase("test")
    .withUsername("test")
    .withUserPassword("test")
    .withRootPassword("root")
    .start();

  const url = `mysql://test:test@${container.getHost()}:${container.getPort()}/test`;

  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });

  return {
    container,
    url,
    stop: async () => {
      await container.stop();
    },
  };
}
