import express from 'express';
import { getSecret, listSecrets, getMultipleSecrets } from '../config/secrets.js';

const router = express.Router();

/**
 * @swagger
 * /secrets:
 *   get:
 *     summary: List all secrets (metadata only)
 *     description: Returns a list of all secrets with their metadata (names, ARNs, etc.) but not their values
 *     tags: [Secrets]
 *     parameters:
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of secrets to return
 *     responses:
 *       200:
 *         description: List of secrets metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secrets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       Name:
 *                         type: string
 *                       ARN:
 *                         type: string
 *                       Description:
 *                         type: string
 *                       LastChangedDate:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res, next) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 100;
    const secrets = await listSecrets(maxResults);
    res.json({
      secrets,
      count: secrets.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /secrets/{name}:
 *   get:
 *     summary: Get a specific secret value
 *     description: Retrieves and returns the value of a specific secret by name
 *     tags: [Secrets]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name or ARN of the secret
 *       - in: query
 *         name: useCache
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to use cached value
 *     responses:
 *       200:
 *         description: Secret value retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 value:
 *                   oneOf:
 *                     - type: object
 *                     - type: string
 *       404:
 *         description: Secret not found
 *       500:
 *         description: Server error
 */
router.get('/:name', async (req, res, next) => {
  try {
    const secretName = decodeURIComponent(req.params.name);
    const useCache = req.query.useCache !== 'false';
    const value = await getSecret(secretName, useCache);
    res.json({
      name: secretName,
      value
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /secrets/batch:
 *   post:
 *     summary: Get multiple secret values
 *     description: Retrieves values for multiple secrets by their names
 *     tags: [Secrets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - names
 *             properties:
 *               names:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of secret names to retrieve
 *               useCache:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to use cached values
 *           example:
 *             names:
 *               - my-secret-1
 *               - my-secret-2
 *             useCache: true
 *     responses:
 *       200:
 *         description: Secrets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secrets:
 *                   type: object
 *                   description: Object with secret names as keys and values as values
 *                 errors:
 *                   type: object
 *                   description: Object with secret names as keys and error messages as values (if any)
 *       400:
 *         description: Bad request (missing names array)
 *       500:
 *         description: Server error
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { names, useCache = true } = req.body;

    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Request body must include a "names" array with at least one secret name',
          statusCode: 400
        }
      });
    }

    const result = await getMultipleSecrets(names, useCache);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
