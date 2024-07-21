import orchestrator from 'tests/orchestrator.js';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.dropAllTables();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe('POST /api/v1/recovery', () => {
  test('Usuário existente que não possui autorização "create:recovery_token:username"', async () => {
    const user = await orchestrator.createUser({
      username: 'Fernando',
    });

    const response = await fetch(`${orchestrator.webserverUrl}/api/v1/recovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: user.username,
      }),
    });

    const responseBody = await response.json();

    expect(response.status).toEqual(403);
    expect(responseBody.name).toEqual('ForbiddenError');
    expect(responseBody.message).toEqual('Você não possui permissão para criar um token de recuperação com username.');
    expect(responseBody.action).toEqual('Verifique se este usuário tem a feature "create:recovery_token:username".');
  }),
    test('E-mail existente, possui autorização', async () => {
      const user = await orchestrator.createUser({
        email: 'claudio@gmail.com',
      });
      await orchestrator.activateUser(user);
      await orchestrator.addFeaturesToUser(user, ['create:recovery_token:username']);

      const response = await fetch(`${orchestrator.webserverUrl}/api/v1/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
        }),
      });

      const responseBody = await response.json();
      expect(response.status).toEqual(201);
      expect(Date.parse(responseBody.expires_at)).not.toEqual(NaN);
      expect(Date.parse(responseBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(responseBody.updated_at)).not.toEqual(NaN);
      expect(responseBody.expires_at > responseBody.created_at).toBe(true);
    }),
    test('Usuário existente com autorização', async () => {
      const user = await orchestrator.createUser({
        username: 'caio',
      });
      await orchestrator.activateUser(user);
      await orchestrator.addFeaturesToUser(user, ['create:recovery_token:username']);
      const sessionObject = await orchestrator.createSession(user);

      const response = await fetch(`${orchestrator.webserverUrl}/api/v1/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          username: user.username,
        }),
      });

      const responseBody = await response.json();
      expect(response.status).toEqual(201);
      expect(Date.parse(responseBody.expires_at)).not.toEqual(NaN);
      expect(Date.parse(responseBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(responseBody.updated_at)).not.toEqual(NaN);
      expect(responseBody.expires_at > responseBody.created_at).toBe(true);
    }),
    test('Email válido mas não existente', async () => {
      const response = await fetch(`${orchestrator.webserverUrl}/api/v1/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'inexistente@gmail.com',
        }),
      });

      // Lembre: Mesmo que o email não existe, é retornado uma resposta como existisse
      const responseBody = await response.json();
      expect(Date.parse(responseBody.expires_at)).not.toEqual(NaN);
      expect(Date.parse(responseBody.created_at)).not.toEqual(NaN);
      expect(Date.parse(responseBody.updated_at)).not.toEqual(NaN);
      expect(responseBody.expires_at > responseBody.created_at).toBe(true);
    }),
    test('Parâmetro inválido', async () => {
      const response = await fetch(`${orchestrator.webserverUrl}/api/v1/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senha: 'testes',
        }),
      });

      const responseBody = await response.json();
      expect(response.status).toBe(400);
      expect(responseBody.name).toBe('ValidationError');
    });
});
