-- 1. Adiciona a coluna 'tenantId' como NULA temporariamente
ALTER TABLE "ClientProfile" ADD COLUMN "tenantId" TEXT;

-- 2. Atualiza as 6 linhas existentes com um tenantId válido
--    SUBSTITUA 'SEU_TENANT_ID_VALIDO_AQUI' pelo ID de um tenant EXISTENTE no seu banco de dados.
--    Você pode encontrar um ID de tenant válido usando 'npx prisma studio' e copiando o ID de um tenant existente.
UPDATE "ClientProfile" SET "tenantId" = '287402ca-f1c4-45e1-af22-4cc7c9385282' WHERE "tenantId" IS NULL;

-- 3. Altera a coluna 'tenantId' para ser NOT NULL
ALTER TABLE "ClientProfile" ALTER COLUMN "tenantId" SET NOT NULL;

-- 4. Adiciona a chave estrangeira (ForeignKey) - MANTENHA ESTA PARTE ORIGINAL
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;