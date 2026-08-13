/**
 * Tenant-isolation integration test.
 *
 * Requires a running PostgreSQL (point DATABASE_URL at a TEST database) and
 * seeded data (`npm run db:seed`). Run with: npm run test:e2e -w backend
 *
 * Verifies the core security property of the platform: a user from Business A
 * can never read or modify Business B's data.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;

  const unique = Date.now();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function register(email: string, businessName: string): Promise<string> {
    const res = await request(app.getHttpServer()).post('/api/auth/register').send({
      firstName: 'Test',
      lastName: 'User',
      email,
      password: 'Password123!',
      businessName,
    });
    expect(res.status).toBe(201);
    return res.body.data.accessToken as string;
  }

  it('registers two isolated businesses', async () => {
    tokenA = await register(`owner-a-${unique}@test.com`, `Business A ${unique}`);
    tokenB = await register(`owner-b-${unique}@test.com`, `Business B ${unique}`);
    expect(tokenA).toBeDefined();
    expect(tokenB).toBeDefined();
  });

  it('Business A cannot read Business B customers', async () => {
    // A creates a customer
    const create = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Secret Customer A' });
    expect(create.status).toBe(201);
    const customerId = create.body.data.id;

    // B cannot fetch A's customer by id
    const steal = await request(app.getHttpServer())
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(steal.status).toBe(404);

    // B cannot update or archive it either
    const update = await request(app.getHttpServer())
      .patch(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hacked' });
    expect(update.status).toBe(404);
  });

  it('Business A cannot read Business B products', async () => {
    const create = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Secret Product B', price: 100 });
    expect(create.status).toBe(201);
    const productId = create.body.data.id;

    const steal = await request(app.getHttpServer())
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(steal.status).toBe(404);
  });

  it('a SUPER_ADMIN token cannot be forged by a tenant', async () => {
    // Tenants hitting admin routes are rejected by the RolesGuard
    const res = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(403);
  });
});
