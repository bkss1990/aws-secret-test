# AWS Secrets Manager Express Backend

Express.js backend with Swagger API documentation and AWS Secrets Manager integration using IAM roles for EC2 instances.

## Features

- Express.js REST API
- Swagger/OpenAPI documentation
- AWS Secrets Manager integration with IAM role authentication
- Secret caching to reduce API calls
- Health check endpoint
- Security middleware (Helmet, CORS)
- Error handling

## Prerequisites

- Node.js (v18 or higher recommended) OR Docker
- AWS Account with Secrets Manager access
- EC2 instance with IAM role attached (for production)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aws-secrets-test
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
AWS_REGION=us-east-1
```

## AWS IAM Role Setup

The EC2 instance needs an IAM role with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecrets"
    ],
    "Resource": "arn:aws:secretsmanager:*:*:secret:*"
  }]
}
```

### Steps to attach IAM role to EC2:

1. Create IAM role in AWS Console
2. Attach the policy above
3. Attach the role to your EC2 instance:
   - Go to EC2 Console
   - Select your instance
   - Actions → Security → Modify IAM role
   - Select the created role

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The server will start on the port specified in `PORT` environment variable (default: 3000).

## Docker Deployment

### Building the Docker Image

```bash
docker build -t aws-secrets-api .
```

### Running with Docker on EC2

**Important:** On EC2, use `--network host` to allow the container to access the EC2 instance metadata service for IAM role credentials:

```bash
docker run -d \
  --name aws-secrets-api \
  --network host \
  -e AWS_REGION=eu-central-1 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  aws-secrets-api
```

**Note:** When using `--network host`, the `-p` port mapping is not needed as the container uses the host's network directly.

### Using Docker Compose

```bash
# Start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Docker on EC2

When running on EC2 with an IAM role attached, you **must** use `--network host` mode so the container can access the EC2 instance metadata service (169.254.169.254) to retrieve IAM role credentials.

**Required:** Use `--network host` when running the container:
```bash
docker run -d --name aws-secrets-api --network host -e AWS_REGION=eu-central-1 aws-secrets-api
```

Or with docker-compose (already configured):
```bash
docker-compose up -d
```

The container will automatically use the instance's IAM role credentials via the instance metadata service.

### Local Testing with Docker

For local testing, you can mount AWS credentials:

```bash
docker run -d \
  --name aws-secrets-api \
  -p 3000:3000 \
  -v ~/.aws:/home/nodejs/.aws:ro \
  -e AWS_REGION=us-east-1 \
  aws-secrets-api
```

Or use environment variables:

```bash
docker run -d \
  --name aws-secrets-api \
  -p 3000:3000 \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e AWS_REGION=us-east-1 \
  aws-secrets-api
```

## API Endpoints

### Health Check
- **GET** `/health` - Returns server health status

### Secrets Management
- **GET** `/secrets` - List all secrets (metadata only)
- **GET** `/secrets/:name` - Get a specific secret value by name
- **POST** `/secrets/batch` - Get multiple secret values by providing names array

### API Documentation
- **GET** `/api-docs` - Swagger UI documentation

## Using AWS Secrets Manager

### Reading Secrets

Import the secrets module in your code:

```javascript
import { getSecret } from './config/secrets.js';

// Read a secret
try {
  const secret = await getSecret('my-secret-name');
  console.log(secret);
} catch (error) {
  console.error('Failed to read secret:', error.message);
}
```

### Secret Format

Secrets can be stored as:
- **JSON strings**: Automatically parsed into objects
- **Plain strings**: Returned as-is

Example JSON secret:
```json
{
  "database": {
    "host": "db.example.com",
    "username": "admin",
    "password": "secret123"
  },
  "apiKey": "abc123"
}
```

### Caching

Secrets are cached for 5 minutes to reduce API calls. To clear cache:

```javascript
import { clearCache, clearSecretCache } from './config/secrets.js';

// Clear all cached secrets
clearCache();

// Clear specific secret
clearSecretCache('my-secret-name');
```

## Project Structure

```
aws-secrets-test/
├── src/
│   ├── config/
│   │   └── secrets.js          # AWS Secrets Manager integration
│   ├── routes/
│   │   ├── health.js           # Health check endpoint
│   │   └── secrets.js          # Secrets endpoints
│   ├── middleware/
│   │   └── errorHandler.js     # Error handling middleware
│   ├── swagger/
│   │   └── swagger.js          # Swagger configuration
│   └── app.js                  # Express app setup
├── .env.example                # Environment variables template
├── .dockerignore               # Docker ignore file
├── .gitignore
├── Dockerfile                  # Docker container definition
├── docker-compose.yml          # Docker Compose configuration
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `AWS_REGION` | AWS region for Secrets Manager | `us-east-1` (or instance metadata) |
| `CORS_ORIGIN` | CORS allowed origin | `*` |

## Testing

### Local Testing

For local development, you can use AWS credentials from `~/.aws/credentials`:

```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-east-1
```

### EC2 Testing

1. Ensure IAM role is attached to EC2 instance
2. Deploy the application
3. Test health endpoint:
```bash
curl http://localhost:3000/health
```

4. Test secrets endpoints:
```bash
# List all secrets (metadata only)
curl http://localhost:3000/secrets

# Get a specific secret value
curl http://localhost:3000/secrets/my-secret-name

# Get multiple secrets
curl -X POST http://localhost:3000/secrets/batch \
  -H "Content-Type: application/json" \
  -d '{"names": ["secret1", "secret2"]}'
```

## Troubleshooting

### Access Denied Error

- Verify IAM role is attached to EC2 instance
- Check IAM policy permissions
- Ensure secret name/ARN is correct

### Secret Not Found

- Verify secret exists in AWS Secrets Manager
- Check secret name spelling
- Ensure secret is in the correct region

### Connection Issues

- Verify EC2 instance has internet access
- Check security group rules
- Verify AWS region configuration

## License

ISC
