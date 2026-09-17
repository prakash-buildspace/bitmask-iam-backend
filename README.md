# Bitmask IAM Backend

A robust, enterprise-grade Identity & Access Management (IAM) backend service built with [NestJS 12](https://nestjs.com/), TypeScript (ESM), Sequelize, Redis, and Swagger.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
  - [Building for Production](#building-for-production)
- [Available Scripts](#available-scripts)
- [API Documentation & Endpoints](#api-documentation--endpoints)
  - [Base URLs](#base-urls)
  - [Health Check](#health-check)
  - [Swagger Documentation](#swagger-documentation)
- [Architecture & Standards](#architecture--standards)
  - [Unified Response Format](#unified-response-format)
  - [Correlation ID & Request Logging](#correlation-id--request-logging)
  - [Exception Handling](#exception-handling)
- [Git & Branching Workflow](#git--branching-workflow)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

The **Bitmask IAM Backend** provides identity, authentication, and authorization services. It is designed around modular NestJS architecture with strict configuration validation, standardized response envelopes, centralized exception filtering, and OpenAPI (Swagger) documentation protected via HTTP Basic Authentication.

---

## Key Features

- **NestJS 12 + Native ESM (`"type": "module"`)**: High-performance modular architecture with modern ECMAScript module support.
- **URI Versioning & Global Prefix**: Clean endpoint routing structured under `/api/v{version}/` (e.g., `/api/v1/...`).
- **Strict Environment Validation**: Validates all configuration keys at bootstrap using `class-validator` and `class-transformer`.
- **Secured OpenAPI / Swagger**: Interactive API docs at `/api/doc` protected by HTTP Basic Auth.
- **Correlation ID Tracking**: Automatically tracks requests with `x-correlation-id` headers and colorized console logging.
- **Standardized Response Envelope**: Consistent response wrapping (`statusCode`, `message`, `data`, `timestamp`, `path`, `duration`).
- **Comprehensive Error Filters**: Custom exception handling for HTTP errors, Sequelize database violations (unique/foreign key constraints), and unexpected server faults.
- **High-Speed Testing with Vitest**: Unit, integration, and E2E testing powered by [Vitest](https://vitest.dev/).
- **Fast Linting**: Linting driven by [oxlint](https://oxc.rs/docs/guide/usage/linter.html).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [NestJS 12](https://nestjs.com/) (Express HTTP adapter) |
| **Language** | [TypeScript 6](https://www.typescriptlang.org/) (ESM) |
| **Database** | [Sequelize 6](https://sequelize.org/) / MySQL |
| **Caching / Store** | [Redis](https://redis.io/) (ioredis / Bitmap Caches) |
| **Documentation** | [Swagger / OpenAPI](https://swagger.io/) (`@nestjs/swagger`) |
| **Validation** | `class-validator` & `class-transformer` |
| **Testing** | [Vitest](https://vitest.dev/) & Supertest |
| **Linter & Formatter** | Oxlint & Prettier |

---

## Project Structure

```text
bitmask-iam-backend/
├── src/
│   ├── common/
│   │   ├── exceptions/            # Custom application exceptions (AppException, etc.)
│   │   ├── filters/               # Global exception filters (Http, Database, AllExceptions)
│   │   ├── interceptors/          # Response envelope & Request logging interceptors
│   │   └── utils/                 # Correlation context & error logging utilities
│   ├── config/                    # Config modules & strict environment validation
│   │   ├── app.config.ts
│   │   ├── config.module.ts
│   │   ├── database.config.ts
│   │   ├── env.validation.ts
│   │   ├── redis.config.ts
│   │   └── swagger.config.ts
│   ├── health/                    # Health check module & runtime configuration inspection
│   │   ├── health.controller.ts
│   │   ├── health.module.ts
│   │   └── health.service.ts
│   ├── redis/                     # Redis module & caching integration
│   ├── app.module.ts              # Root application module
│   └── main.ts                    # Application bootstrap entry point
├── test/
│   └── app.e2e-spec.ts            # E2E test suite
├── .env.example                   # Sample environment configuration
├── nest-cli.json                  # NestJS CLI configuration
├── oxlint.json                    # Oxlint configuration
├── package.json                   # Project dependencies and npm scripts
├── tsconfig.json                  # TypeScript compiler configuration
├── vitest.config.ts               # Vitest configuration for unit tests
└── vitest.config.e2e.ts           # Vitest configuration for E2E tests
```

---

## Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or later
- **MySQL**: `v8.0` or higher
- **Redis**: `v6.x` or higher

---

## Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

### Configuration Variables Reference

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | `string` | `development` | Application environment (`development`, `production`, `test`, `provision`) |
| `PORT` | `number` | `4001` | HTTP port for the application server (fallback: `5001`) |
| `API_PREFIX` | `string` | `api` | Global API route prefix |
| `API_VERSION` | `string` | `1` | Default URI version number |
| `SERVER_URLS` | `string` | `http://localhost:4001` | Comma-separated list of server URLs for Swagger docs |
| `SWAGGER_ENABLED` | `boolean` | `true` | Enable or disable Swagger UI |
| `SWAGGER_PATH` | `string` | `api/doc` | Path where Swagger documentation is hosted |
| `SWAGGER_BASIC_AUTH_USERNAME` | `string` | `developer` | Username for Swagger HTTP Basic Auth (**Required**) |
| `SWAGGER_BASIC_AUTH_PASSWORD` | `string` | `changeme` | Password for Swagger HTTP Basic Auth (**Required**) |
| `DB_HOST` | `string` | `127.0.0.1` | MySQL server host (**Required**) |
| `DB_PORT` | `number` | `3306` | MySQL server port |
| `DB_USER` | `string` | `root` | MySQL database user (**Required**) |
| `DB_PASS` | `string` | `""` | MySQL database password |
| `DB_NAME` | `string` | `iam_testing_db` | MySQL database name (**Required**) |
| `DB_SYNC` | `boolean` | `false` | Automatically synchronize Sequelize models with database |
| `DB_LOGGING` | `boolean` | `false` | Enable SQL query logging |
| `DB_POOL_MAX` | `number` | `10` | Maximum database connection pool size |
| `DB_POOL_MIN` | `number` | `0` | Minimum database connection pool size |
| `DB_POOL_ACQUIRE` | `number` | `30000` | Connection pool acquire timeout in ms |
| `DB_POOL_IDLE` | `number` | `10000` | Connection pool idle timeout in ms |
| `DB_RETRY_ATTEMPTS` | `number` | `3` | Connection retry attempts count |
| `DB_RETRY_DELAY` | `number` | `3000` | Delay between connection retries in ms |
| `REDIS_HOST` | `string` | `127.0.0.1` | Redis host (**Required**) |
| `REDIS_PORT` | `number` | `6379` | Redis port |
| `REDIS_PASSWORD` | `string` | `""` | Redis authentication password |
| `REDIS_TLS` | `boolean` | `false` | Enable TLS connection to Redis |
| `REDIS_REQUIRED` | `boolean` | `true` | Treat Redis availability as mandatory |
| `REDIS_KEY_PREFIX` | `string` | `bit-iam:` | Prefix prepended to all Redis cache keys |

---

## Getting Started

### Installation

Install dependencies using `npm`:

```bash
npm install
```

### Running the Application

```bash
# Development mode with hot-reloading
npm run start:dev

# Standard start mode
npm run start

# Debug mode
npm run start:debug
```

Once running, the console will output:
```text
[Bootstrap] Bitmap IAM API started successfully on port 4001
```

### Building for Production

```bash
# Build the TypeScript project to /dist
npm run build

# Start the compiled production build
npm run start:prod
```

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run start:dev` | `nest start --watch` | Starts the app in watch mode with hot reload |
| `npm run build` | `nest build` | Compiles the NestJS application into `/dist` |
| `npm run start:prod` | `node dist/main` | Runs the compiled production build |
| `npm run lint` | `oxlint src/ test/` | Fast static analysis via Oxlint |
| `npm run format` | `prettier --write ...` | Formats code using Prettier |
| `npm run test` | `vitest run` | Runs unit tests |
| `npm run test:watch` | `vitest` | Runs unit tests in watch mode |
| `npm run test:cov` | `vitest run --coverage`| Runs tests with coverage report |
| `npm run test:e2e` | `vitest run --config ...`| Runs end-to-end (E2E) tests |

---

## API Documentation & Endpoints

### Base URLs

All REST API endpoints are prefixed with the global API prefix and version identifier:
```text
http://localhost:4001/api/v1
```

> [!NOTE]
> Navigating directly to `http://localhost:4001/` will return a `404 Not Found` response because all routes are scoped under the global prefix `/api` and default version `/v1`.

### Health Check

Verify that the application and its configurations are loaded properly:

```http
GET /api/v1/health
Host: localhost:4001
```

**Example Response (`200 OK`):**
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "status": "ok",
    "timestamp": "2026-09-17T05:28:16.827Z",
    "uptime": 45,
    "environment": "development",
    "version": "1",
    "config": {
      "app": {
        "port": 4001,
        "apiPrefix": "api",
        "apiVersion": "1",
        "serverUrls": "http://localhost:4001"
      },
      "database": {
        "host": "127.0.0.1",
        "port": 3306,
        "name": "iam_testing_db",
        "sync": false,
        "logging": false,
        "poolMax": 10,
        "poolMin": 0
      },
      "redis": {
        "host": "127.0.0.1",
        "port": 6379,
        "tls": false,
        "required": true,
        "keyPrefix": "bit-iam:"
      },
      "swagger": {
        "enabled": true,
        "path": "api/doc"
      }
    },
    "system": {
      "memoryUsage": { ... },
      "nodeVersion": "v22.x.x"
    }
  },
  "timestamp": "2026-09-17T05:28:16.828Z",
  "path": "/api/v1/health",
  "duration": "2ms"
}
```

### Swagger Documentation

Interactive OpenAPI / Swagger documentation is accessible in the browser:

- **Swagger UI**: [`http://localhost:4001/api/doc`](http://localhost:4001/api/doc)
- **OpenAPI JSON**: [`http://localhost:4001/api/doc-json`](http://localhost:4001/api/doc-json)

> [!IMPORTANT]
> Swagger is protected by **HTTP Basic Authentication**. When prompted by your browser:
> - **Username**: `developer` (or your configured `SWAGGER_BASIC_AUTH_USERNAME`)
> - **Password**: `123456` / `changeme` (or your configured `SWAGGER_BASIC_AUTH_PASSWORD`)

---

## Architecture & Standards

### Unified Response Format

All successful responses are automatically formatted by `ResponseInterceptor`:

```typescript
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-09-17T05:28:16.828Z",
  "path": "/api/v1/resource",
  "duration": "3ms"
}
```

### Correlation ID & Request Logging

Every request is tracked using an `x-correlation-id`:
- If a client supplies an `x-correlation-id` header, it is reused; otherwise, a new UUID v4 is generated.
- The correlation ID is included in response headers and logged alongside the request method, route, status code, and duration.

### Exception Handling

Centralized exception filters intercept errors before they leave the server:
- **`HttpExceptionFilter`**: Formats standard HTTP errors (e.g. 400, 401, 403, 404, 429) with structured error codes.
- **`DatabaseExceptionFilter`**: Translates Sequelize errors (such as `UniqueConstraintError` or `ForeignKeyConstraintError`) into friendly HTTP 409 Conflict / 400 Bad Request responses.
- **`AllExceptionsFilter`**: Catches unhandled errors, logs a stack trace with a unique `errorId` (UUID), and returns a safe HTTP 500 payload without leaking internal details.

---

## Git & Branching Workflow

This project follows a structured branch promotion strategy to ensure production stability:

```text
feature/* or fix/*  ──►  staging (Development & Testing)  ──►  main (Production Ready)
```

| Branch | Purpose | Policies |
|---|---|---|
| **`staging`** | Active development, integration, and pre-production QA | Developers push new features, bug fixes, and development code here. Automated tests and integration testing run against staging. |
| **`main`** | Production-ready stable release | Code is only merged from `staging` to `main` after full test suites pass and manual QA verification is completed. |

### Development Workflow:
1. Create a feature branch or checkout `staging`:
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/my-new-feature
   ```
2. Implement changes, format, lint, and test:
   ```bash
   npm run format
   npm run lint
   npm run test:e2e
   ```
3. Commit and merge into `staging`:
   ```bash
   git checkout staging
   git merge feature/my-new-feature
   git push origin staging
   ```
4. Once verified on staging, promote to `main`:
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

---

## Troubleshooting

### Why is the server not accessible at `http://localhost:4001`?

1. **The application process is not running:**
   Ensure you have started the server using:
   ```bash
   npm run start:dev
   ```
2. **Accessing the root `/` URL directly:**
   Visiting `http://localhost:4001/` returns a `404 Not Found` because routes are mounted under `/api/v1/`. Test with:
   ```text
   http://localhost:4001/api/v1/health
   ```
3. **Missing or invalid `.env` variables:**
   The application uses strict startup validation (`env.validation.ts`). If mandatory variables (such as `DB_HOST`, `DB_USER`, `DB_NAME`, `SWAGGER_BASIC_AUTH_USERNAME`, or `REDIS_HOST`) are missing, the server will crash on boot with:
   ```text
   Environment validation failed: <property>: <constraint>
   ```
4. **Default port fallback:**
   If `.env` is omitted, the application defaults to port `5001`. Check if your service is listening on `http://localhost:5001`.
5. **Port conflict:**
   Verify if another process is already bound to port 4001:
   ```powershell
   # Windows PowerShell
   Get-NetTCPConnection -LocalPort 4001 -ErrorAction SilentlyContinue
   ```

---

## License

UNLICENSED - Private repository.
