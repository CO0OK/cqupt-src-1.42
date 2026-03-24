import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function updateSessionFromResponse(session, response) {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return;
  const tokenPart = setCookie.split(';')[0];
  if (tokenPart) session.cookie = tokenPart;
}

async function request(path, { method = 'GET', body, session } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (session?.cookie) {
    headers['Cookie'] = session.cookie;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (session) {
    updateSessionFromResponse(session, res);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  return { status: res.status, data };
}

function logStep(name, extra = '') {
  console.log(`[SMOKE] ${name}${extra ? `: ${extra}` : ''}`);
}

async function runLearningSmoke(admin, user) {
  logStep('Learning unauth forbidden');
  const unauthCreateLab = await request('/api/learning/labs', {
    method: 'POST',
    body: { title: 'smoke-lab' },
  });
  assert(unauthCreateLab.status === 401, `Expected 401, got ${unauthCreateLab.status}`);

  logStep('Learning user role forbidden');
  const userCreateLab = await request('/api/learning/labs', {
    method: 'POST',
    session: user,
    body: { title: 'smoke-user-lab' },
  });
  assert(userCreateLab.status === 403, `Expected 403, got ${userCreateLab.status}`);

  logStep('Learning admin create/update/archive lab');
  const createLab = await request('/api/learning/labs', {
    method: 'POST',
    session: admin,
    body: {
      title: 'SMOKE-LAB',
      description: 'smoke',
      difficulty: '中等',
      category: 'SMOKE',
      points: 101,
      url: 'https://example.com/smoke/lab',
      image: 'https://picsum.photos/seed/smoke-lab/800/450',
    },
  });
  assert(createLab.status === 201 && createLab.data?.success, `Create lab failed: ${createLab.status}`);
  const labId = createLab.data.lab.id;

  const updateLab = await request(`/api/learning/labs/${labId}`, {
    method: 'PUT',
    session: admin,
    body: { title: 'SMOKE-LAB-UPDATED', points: 202 },
  });
  assert(updateLab.status === 200 && updateLab.data?.lab?.title === 'SMOKE-LAB-UPDATED', 'Update lab failed');

  const archiveLab = await request(`/api/learning/labs/${labId}`, {
    method: 'DELETE',
    session: admin,
  });
  assert(archiveLab.status === 200 && archiveLab.data?.success, 'Archive lab failed');

  const labsAfterArchive = await request('/api/learning/labs');
  assert(Array.isArray(labsAfterArchive.data), 'Learning labs response should be array');
  assert(!labsAfterArchive.data.find((l) => l.id === labId), 'Archived lab should not be listed');

  logStep('Learning admin create/update/archive material');
  const createMaterial = await request('/api/learning/materials', {
    method: 'POST',
    session: admin,
    body: {
      title: 'SMOKE-MATERIAL',
      author: 'admin',
      type: '技术文档',
      url: 'https://example.com/smoke/material',
      description: 'smoke',
    },
  });
  assert(createMaterial.status === 201 && createMaterial.data?.success, 'Create material failed');
  const materialId = createMaterial.data.material.id;

  const updateMaterial = await request(`/api/learning/materials/${materialId}`, {
    method: 'PUT',
    session: admin,
    body: { title: 'SMOKE-MATERIAL-UPDATED' },
  });
  assert(updateMaterial.status === 200 && updateMaterial.data?.material?.title === 'SMOKE-MATERIAL-UPDATED', 'Update material failed');

  const archiveMaterial = await request(`/api/learning/materials/${materialId}`, {
    method: 'DELETE',
    session: admin,
  });
  assert(archiveMaterial.status === 200 && archiveMaterial.data?.success, 'Archive material failed');

  const materialsAfterArchive = await request('/api/learning/materials');
  assert(Array.isArray(materialsAfterArchive.data), 'Learning materials response should be array');
  assert(!materialsAfterArchive.data.find((m) => m.id === materialId), 'Archived material should not be listed');

  logStep('Learning user create discussion, admin archive');
  const createDiscussion = await request('/api/learning/discussions', {
    method: 'POST',
    session: user,
    body: { title: 'SMOKE-DISCUSSION', category: 'SMOKE', content: 'smoke' },
  });
  assert(createDiscussion.status === 201 && createDiscussion.data?.success, 'Create discussion failed');
  const discussionId = createDiscussion.data.discussion.id;

  const archiveDiscussion = await request(`/api/learning/discussions/${discussionId}`, {
    method: 'DELETE',
    session: admin,
  });
  assert(archiveDiscussion.status === 200 && archiveDiscussion.data?.success, 'Archive discussion failed');

  const discussionsAfterArchive = await request('/api/learning/discussions');
  assert(Array.isArray(discussionsAfterArchive.data), 'Learning discussions response should be array');
  assert(!discussionsAfterArchive.data.find((d) => d.id === discussionId), 'Archived discussion should not be listed');
}

async function runMallSmoke(admin, user) {
  logStep('Mall admin create/update/delete smoke product');
  const createProduct = await request('/api/mall/products', {
    method: 'POST',
    session: admin,
    body: {
      name: 'SMOKE-PRODUCT',
      price: 111,
      stock: 2,
      category: '周边',
      image: 'https://picsum.photos/seed/smoke-product/200/200',
      status: 'Active',
    },
  });
  assert(createProduct.status === 200 && createProduct.data?.success, 'Create product failed');
  const tempProductId = createProduct.data.product.id;

  const updateProduct = await request(`/api/mall/products/${tempProductId}`, {
    method: 'PATCH',
    session: admin,
    body: {
      name: 'SMOKE-PRODUCT-UPDATED',
      price: 222,
      stock: 3,
      status: 'Active',
    },
  });
  assert(updateProduct.status === 200 && updateProduct.data?.success, 'Update product failed');
  assert(updateProduct.data?.product?.name === 'SMOKE-PRODUCT-UPDATED', 'Updated product name mismatch');

  logStep('Mall pick product');
  const productsBefore = await request('/api/mall/products');
  assert(Array.isArray(productsBefore.data), 'Mall products response should be array');

  const userMeBefore = await request('/api/auth/me', { session: user });
  assert(userMeBefore.status === 200 && userMeBefore.data?.user, 'User auth/me failed');
  const userInfo = userMeBefore.data.user;

  const adminMeBefore = await request('/api/auth/me', { session: admin });
  assert(adminMeBefore.status === 200 && adminMeBefore.data?.user, 'Admin auth/me failed');
  const adminUser = adminMeBefore.data.user;

  const targetProduct = productsBefore.data.find(
    (p) => p.id !== tempProductId && p.status === 'Active' && p.stock > 0 && p.price <= userInfo.points,
  );
  assert(targetProduct, 'No redeemable product for mall smoke');

  logStep('Mall user cannot redeem for another user');
  const userRedeemForAdmin = await request('/api/mall/redemptions', {
    method: 'POST',
    session: user,
    body: { userId: adminUser.id, productId: targetProduct.id },
  });
  assert(userRedeemForAdmin.status === 403, `Expected 403, got ${userRedeemForAdmin.status}`);

  logStep('Mall admin cannot redeem');
  const adminRedeem = await request('/api/mall/redemptions', {
    method: 'POST',
    session: admin,
    body: { userId: adminUser.id, productId: targetProduct.id, quantity: 1 },
  });
  assert(adminRedeem.status === 403, `Expected 403, got ${adminRedeem.status}`);

  logStep('Mall user redeem + admin issue');
  const redeem = await request('/api/mall/redemptions', {
    method: 'POST',
    session: user,
    body: { userId: userInfo.id, productId: targetProduct.id, quantity: 1 },
  });
  assert(redeem.status === 200 && redeem.data?.success, 'Mall redeem failed');

  const redemptionCode = redeem.data.redemption.id;
  const userPointsAfterRedeem = redeem.data.userPoints;

  const userMeAfter = await request('/api/auth/me', { session: user });
  assert(userMeAfter.status === 200, 'User auth/me after redeem failed');
  assert(
    userMeAfter.data.user.points === userPointsAfterRedeem,
    'User points mismatch after redeem',
  );

  const productsAfter = await request('/api/mall/products');
  const productAfter = productsAfter.data.find((p) => p.id === targetProduct.id);
  assert(productAfter, 'Target product missing after redeem');
  assert(
    productAfter.stock === targetProduct.stock - 1,
    `Product stock not decremented as expected (${targetProduct.stock} -> ${productAfter.stock})`,
  );

  const issue = await request(`/api/mall/redemptions/${redemptionCode}`, {
    method: 'PATCH',
    session: admin,
    body: { status: 'Issued' },
  });
  assert(issue.status === 200 && issue.data?.redemption?.status === 'Issued', 'Issue redemption failed');

  logStep('Mall delete conflict for redeemed product');
  const deleteRedeemedProduct = await request(`/api/mall/products/${targetProduct.id}`, {
    method: 'DELETE',
    session: admin,
  });
  assert(deleteRedeemedProduct.status === 409, `Expected 409, got ${deleteRedeemedProduct.status}`);

  logStep('Mall delete smoke product');
  const deleteTempProduct = await request(`/api/mall/products/${tempProductId}`, {
    method: 'DELETE',
    session: admin,
  });
  assert(deleteTempProduct.status === 200 && deleteTempProduct.data?.success, 'Delete smoke product failed');

  const adminRedemptions = await request(`/api/mall/redemptions?userId=${userInfo.id}`, {
    session: admin,
  });
  const issuedRecord = adminRedemptions.data.find((r) => r.id === redemptionCode);
  assert(issuedRecord?.status === 'Issued', 'Issued redemption status not persisted');

  if (process.env.DATABASE_URL) {
    logStep('Mall DB point-log verification');
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    try {
      const redemption = await prisma.redemption.findUnique({
        where: { redemptionCode },
        select: { id: true, pointsCost: true },
      });
      assert(redemption, 'Redemption row not found in DB');

      const pointLog = await prisma.userPointLog.findFirst({
        where: {
          userId: userInfo.id,
          changeType: 'mall_redeem',
          referenceType: 'redemption',
          referenceId: redemption.id,
        },
        orderBy: { createdAt: 'desc' },
      });
      assert(pointLog, 'Point log row not found for redemption');
      assert(
        pointLog.delta === -redemption.pointsCost,
        `Point log delta mismatch (${pointLog.delta} vs ${-redemption.pointsCost})`,
      );
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function runLogsSmoke(admin, user) {
  logStep('Logs unauth forbidden');
  const unauthLogs = await request('/api/logs');
  assert(unauthLogs.status === 401, `Expected 401, got ${unauthLogs.status}`);

  logStep('Logs user role forbidden');
  const userLogs = await request('/api/logs', { session: user });
  assert(userLogs.status === 403, `Expected 403, got ${userLogs.status}`);

  logStep('Logs admin fetch + schema');
  const adminLogs = await request('/api/logs?limit=20', { session: admin });
  assert(adminLogs.status === 200, `Expected 200, got ${adminLogs.status}`);
  assert(adminLogs.data?.success === true, 'Logs success flag mismatch');
  assert(Array.isArray(adminLogs.data?.logs), 'Logs should be an array');
  assert(typeof adminLogs.data?.total === 'number', 'Logs total should be a number');

  if (adminLogs.data.logs.length > 0) {
    const row = adminLogs.data.logs[0];
    assert(typeof row.id === 'number', 'Log row id should be number');
    assert(typeof row.time === 'string' && row.time.length > 0, 'Log row time should be string');
    assert(typeof row.user === 'string', 'Log row user should be string');
    assert(typeof row.action === 'string', 'Log row action should be string');
    assert(typeof row.status === 'string', 'Log row status should be string');
    assert(typeof row.source === 'string', 'Log row source should be string');
  }
}

async function run() {
  console.log(`[SMOKE] base=${BASE_URL}`);

  const admin = { cookie: '' };
  const user = { cookie: '' };

  logStep('Login cqupt_user');
  const userLogin = await request('/api/login', {
    method: 'POST',
    session: user,
    body: { authCode: '2024999', password: 'cqupt123' },
  });
  assert(userLogin.status === 200 && userLogin.data?.success, 'User login failed');

  logStep('Login admin');
  const adminLogin = await request('/api/login', {
    method: 'POST',
    session: admin,
    body: { authCode: '0000001', password: 'admin' },
  });
  assert(adminLogin.status === 200 && adminLogin.data?.success, 'Admin login failed');

  await runLearningSmoke(admin, user);
  await runMallSmoke(admin, user);
  await runLogsSmoke(admin, user);

  console.log('[SMOKE] PASS learning+mall+logs');
}

run().catch((err) => {
  console.error('[SMOKE] FAIL', err.message);
  process.exit(1);
});
