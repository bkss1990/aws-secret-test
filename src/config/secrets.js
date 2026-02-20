import { SecretsManagerClient, GetSecretValueCommand, ListSecretsCommand } from '@aws-sdk/client-secrets-manager';

/**
 * AWS Secrets Manager client instance
 * Uses default credential chain (IAM role for EC2 instances)
 */
const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Cache for secrets to avoid excessive API calls
 * Key: secret name, Value: { secret, timestamp }
 */
const secretCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetches a secret from AWS Secrets Manager
 * Uses IAM role credentials when running on EC2
 * 
 * @param {string} secretName - Name or ARN of the secret
 * @param {boolean} useCache - Whether to use cached value (default: true)
 * @returns {Promise<Object|string>} - Parsed JSON secret or raw string
 * @throws {Error} - If secret cannot be retrieved
 */
export async function getSecret(secretName, useCache = true) {
  // Check cache first
  if (useCache) {
    const cached = secretCache.get(secretName);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.secret;
    }
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName
    });

    const response = await client.send(command);

    // Parse the secret value
    let secretValue;
    if (response.SecretString) {
      try {
        // Try to parse as JSON
        secretValue = JSON.parse(response.SecretString);
      } catch (e) {
        // If not JSON, return as string
        secretValue = response.SecretString;
      }
    } else if (response.SecretBinary) {
      // Handle binary secrets
      secretValue = Buffer.from(response.SecretBinary, 'base64').toString('utf-8');
      try {
        secretValue = JSON.parse(secretValue);
      } catch (e) {
        // Keep as string if not JSON
      }
    } else {
      throw new Error('Secret value is empty');
    }

    // Update cache
    secretCache.set(secretName, {
      secret: secretValue,
      timestamp: Date.now()
    });

    return secretValue;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      throw new Error(`Secret '${secretName}' not found`);
    } else if (error.name === 'AccessDeniedException') {
      throw new Error(`Access denied to secret '${secretName}'. Check IAM role permissions.`);
    } else if (error.name === 'DecryptionFailureException') {
      throw new Error(`Failed to decrypt secret '${secretName}'`);
    } else {
      throw new Error(`Failed to retrieve secret '${secretName}': ${error.message}`);
    }
  }
}

/**
 * Clears the secret cache
 * Useful for testing or when secrets are updated
 */
export function clearCache() {
  secretCache.clear();
}

/**
 * Clears a specific secret from cache
 * @param {string} secretName - Name of the secret to clear from cache
 */
export function clearSecretCache(secretName) {
  secretCache.delete(secretName);
}

/**
 * Lists all secrets (metadata only, not values)
 * @param {number} maxResults - Maximum number of secrets to return (default: 100)
 * @returns {Promise<Array>} - Array of secret metadata objects
 * @throws {Error} - If secrets cannot be listed
 */
export async function listSecrets(maxResults = 100) {
  try {
    const command = new ListSecretsCommand({
      MaxResults: maxResults
    });

    const response = await client.send(command);
    return response.SecretList || [];
  } catch (error) {
    if (error.name === 'AccessDeniedException') {
      throw new Error('Access denied to list secrets. Check IAM role permissions.');
    } else {
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }
}

/**
 * Fetches multiple secrets by their names
 * @param {Array<string>} secretNames - Array of secret names to fetch
 * @param {boolean} useCache - Whether to use cached values (default: true)
 * @returns {Promise<Object>} - Object with secret names as keys and values as values
 */
export async function getMultipleSecrets(secretNames, useCache = true) {
  const results = {};
  const errors = {};

  // Fetch all secrets in parallel
  const promises = secretNames.map(async (secretName) => {
    try {
      const value = await getSecret(secretName, useCache);
      results[secretName] = value;
    } catch (error) {
      errors[secretName] = error.message;
    }
  });

  await Promise.all(promises);

  return {
    secrets: results,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}
