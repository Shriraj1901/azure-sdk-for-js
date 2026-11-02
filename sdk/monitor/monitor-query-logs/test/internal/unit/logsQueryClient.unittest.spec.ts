// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { LogsQueryOptions } from "../../../src/index.js";
import { Durations, LogsQueryClient } from "../../../src/index.js";
import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import { createHttpHeaders } from "@azure/core-rest-pipeline";
import { describe, it, assert, expect } from "vitest";
import { toSupportTracing } from "@azure-tools/test-utils-vitest";

expect.extend({ toSupportTracing });

describe("LogsQueryClient unit tests", () => {
  /**
   * Custom scopes and endpoints are needed if you're connecting to
   * a government cloud, for instance.
   */
  const scopesPassed: string[] = [];

  const tokenCredential: TokenCredential = {
    async getToken(
      scopes: string | string[],
      _options?: GetTokenOptions,
    ): Promise<AccessToken | null> {
      if (Array.isArray(scopes)) {
        scopesPassed.push(...scopes);
      } else {
        scopesPassed.push(scopes);
      }

      throw new Error("Shortcircuit auth exception");
    },
  };

  it("using custom scopes and endpoints", async () => {
    const client = new LogsQueryClient(tokenCredential, {
      endpoint: "https://customEndpoint1",
    });

    try {
      await client.queryWorkspace("workspaceId", "query", { duration: Durations.fiveMinutes });
      assert.fail("Should have thrown");
    } catch (err: any) {
      assert.deepNestedInclude(err, {
        message: "Shortcircuit auth exception",
      });
    }
  });

  it.each([
    ["https://api.loganalytics.us", "https://api.loganalytics.us/.default"],
    ["https://api.loganalytics.us/", "https://api.loganalytics.us/.default"],
    ["https://api.loganalytics.azure.cn/.default", "https://api.loganalytics.azure.cn/.default"],
  ])("requests a token for the configured audience %s", async (audience, expectedScope) => {
    const requestedScopes: string[] = [];
    const client = new LogsQueryClient(
      {
        async getToken(scopes: string | string[]): Promise<AccessToken | null> {
          requestedScopes.push(...(Array.isArray(scopes) ? scopes : [scopes]));
          throw new Error("Shortcircuit auth exception");
        },
      },
      { endpoint: "https://customEndpoint1", audience },
    );

    await expect(
      client.queryWorkspace("workspaceId", "query", { duration: Durations.fiveMinutes }),
    ).rejects.toThrow("Shortcircuit auth exception");
    assert.deepEqual(requestedScopes, [expectedScope]);
  });

  it("prefers explicit credential scopes over the audience", async () => {
    const requestedScopes: string[] = [];
    const client = new LogsQueryClient(
      {
        async getToken(scopes: string | string[]): Promise<AccessToken | null> {
          requestedScopes.push(...(Array.isArray(scopes) ? scopes : [scopes]));
          throw new Error("Shortcircuit auth exception");
        },
      },
      {
        endpoint: "https://customEndpoint1",
        audience: "https://api.loganalytics.us",
        credentials: { scopes: ["https://custom.scope/.default"] },
      },
    );

    await expect(
      client.queryWorkspace("workspaceId", "query", { duration: Durations.fiveMinutes }),
    ).rejects.toThrow("Shortcircuit auth exception");
    assert.deepEqual(requestedScopes, ["https://custom.scope/.default"]);
  });

  it("defaults to the public cloud scope without an audience", async () => {
    const requestedScopes: string[] = [];
    const client = new LogsQueryClient({
      async getToken(scopes: string | string[]): Promise<AccessToken | null> {
        requestedScopes.push(...(Array.isArray(scopes) ? scopes : [scopes]));
        throw new Error("Shortcircuit auth exception");
      },
    });

    await expect(
      client.queryWorkspace("workspaceId", "query", { duration: Durations.fiveMinutes }),
    ).rejects.toThrow("Shortcircuit auth exception");
    assert.deepEqual(requestedScopes, ["https://api.loganalytics.io/.default"]);
  });

  it("keeps custom request options in queryWorkspace", async () => {
    const client = new LogsQueryClient(
      {
        getToken: async () => Promise.resolve({ token: "token", expiresOnTimestamp: 1234567890 }),
      },
      {
        endpoint: "https://customEndpoint1",
      },
    );
    const testPipelinePolicy = {
      name: "testPipelinePolicy",
      sendRequest: async (request: any) => {
        assert.equal(request.headers.get("randomHeader"), "4321");
        assert.equal(request.timeout, "3333");
        return {
          request,
          status: 200,
          headers: createHttpHeaders(),
          bodyAsText: `{ "tables": [] }`,
        };
      },
    };
    const testOptions: LogsQueryOptions = {
      requestOptions: {
        timeout: 3333,
        headers: {
          randomHeader: "4321",
        },
      },
    };
    client.pipeline.addPolicy(testPipelinePolicy, { afterPhase: "Sign" });

    await client.queryWorkspace(
      "workspaceId",
      "query",
      {
        duration: Durations.fiveMinutes,
      },
      testOptions,
    );
  });

  it("keeps custom request options in queryResource", async () => {
    const client = new LogsQueryClient(
      {
        getToken: async () => Promise.resolve({ token: "token", expiresOnTimestamp: 1234567890 }),
      },
      {
        endpoint: "https://customEndpoint1",
      },
    );
    const testPipelinePolicy = {
      name: "testPipelinePolicy",
      sendRequest: async (request: any) => {
        assert.equal(request.headers.get("randomHeader"), "4321");
        assert.equal(request.timeout, "3333");
        return {
          request,
          status: 200,
          headers: createHttpHeaders(),
          bodyAsText: `{ "tables": [] }`,
        };
      },
    };
    const testOptions: LogsQueryOptions = {
      requestOptions: {
        timeout: 3333,
        headers: {
          randomHeader: "4321",
        },
      },
    };
    client.pipeline.addPolicy(testPipelinePolicy, { afterPhase: "Sign" });

    await client.queryResource(
      "workspaceId",
      "query",
      {
        duration: Durations.fiveMinutes,
      },
      testOptions,
    );
  });
});
