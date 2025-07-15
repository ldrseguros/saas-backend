# 🚀 Guia Completo: Configuração, Testes e Produção

## 📋 Índice

1. [Configuração Inicial](#configuração-inicial)
2. [Configuração do Stripe](#configuração-do-stripe)
3. [Testes Locais](#testes-locais)
4. [Integração Frontend-Backend](#integração-frontend-backend)
5. [Testes de Pagamento](#testes-de-pagamento)
6. [Preparação para Produção](#preparação-para-produção)

---

## 1. 🔧 Configuração Inicial

### Passo 1: Configurar Variáveis de Ambiente

```bash
# 1. Copie o arquivo de exemplo
cp env.example .env

# 2. Edite o arquivo .env com suas configurações
```

### Passo 2: Configurar Banco de Dados

```bash
# 1. Certifique-se que o PostgreSQL está rodando
# 2. Crie o banco de dados
createdb saas_estetica_dev

# 3. Execute as migrações
npx prisma migrate dev --name init

# 4. Gere o cliente Prisma
npx prisma generate
```

### Passo 3: Setup Inicial dos Dados

```bash
# Execute o script de setup
node setup-development.js
```

---

## 2. 💳 Configuração do Stripe

### Passo 1: Criar Conta no Stripe

1. Acesse https://stripe.com
2. Crie uma conta (pode começar com o modo teste)
3. Acesse o Dashboard

### Passo 2: Obter Chaves de API

1. No Dashboard, vá em **Developers → API Keys**
2. Copie a **Publishable key** (pk*test*...)
3. Copie a **Secret key** (sk*test*...)

### Passo 3: Configurar Webhook

1. Vá em **Developers → Webhooks**
2. Clique em **Add endpoint**
3. URL: `http://localhost:3000/api/payments/webhook`
4. Eventos para escutar:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copie o **Signing secret** (whsec\_...)

### Passo 4: Atualizar .env

```env
STRIPE_SECRET_KEY="sk_test_sua_chave_aqui"
STRIPE_PUBLISHABLE_KEY="pk_test_sua_chave_aqui"
STRIPE_WEBHOOK_SECRET="whsec_seu_webhook_secret_aqui"
```

---

## 3. 🧪 Testes Locais

### Passo 1: Testar Backend

```bash
# Instalar dependências
npm install

# Iniciar servidor
npm run dev

# Em outro terminal, testar APIs básicas
curl http://localhost:3000/api/public/health
```

### Passo 2: Testar Integração com Stripe

```bash
# Execute o script de teste do Stripe
node test-stripe.js
```

### Passo 3: Testar Endpoints Principais

#### A. Registrar Estética (Signup)

```bash
curl -X POST http://localhost:3000/api/public/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Minha Estética Teste",
    "ownerName": "João Silva",
    "email": "teste@minhastetica.com",
    "password": "senha123",
    "phone": "(11) 99999-9999",
    "planId": "ID_DO_PLANO_BASICO"
  }'
```

#### B. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@minhastetica.com",
    "password": "senha123"
  }'
```

#### C. Criar Sessão de Pagamento

```bash
curl -X POST http://localhost:3000/api/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "planId": "ID_DO_PLANO",
    "tenantId": "ID_DO_TENANT",
    "successUrl": "http://localhost:3001/success",
    "cancelUrl": "http://localhost:3001/cancel"
  }'
```

---

## 4. 🔗 Integração Frontend-Backend

### Problemas Comuns e Soluções

#### A. CORS Issues

Se tiver problemas de CORS, certifique-se que o backend tem:

```javascript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
  })
);
```

#### B. Autenticação

O frontend deve enviar o token JWT no header:

```javascript
const token = localStorage.getItem("token");
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
```

#### C. Multi-tenant

O frontend deve enviar o tenant via header ou subdomain:

```javascript
const headers = {
  "X-Tenant-ID": tenantId,
  // ou usar subdomain: subdomain.seudominio.com
};
```

---

## 5. 💰 Testes de Pagamento

### Cartões de Teste do Stripe

```
# Sucesso
4242 4242 4242 4242

# Falha genérica
4000 0000 0000 0002

# Requer autenticação 3D Secure
4000 0025 0000 3155

# Cartão internacional
4000 0000 0000 0408
```

### Fluxo de Teste Completo

1. **Registrar nova estética** → Obtém período trial
2. **Fazer login** → Acessar área admin
3. **Tentar acessar recursos premium** → Deve funcionar (trial)
4. **Iniciar processo de pagamento** → Cria sessão Stripe
5. **Completar pagamento** → Webhook atualiza status
6. **Verificar status da assinatura** → Deve estar ACTIVE

---

## 6. 🚀 Preparação para Produção

### A. Variáveis de Ambiente de Produção

```env
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@prod-db-url/database"
JWT_SECRET="super-secret-production-key-256-bits"
STRIPE_SECRET_KEY="sk_live_sua_chave_de_producao"
STRIPE_WEBHOOK_SECRET="whsec_webhook_secret_de_producao"
FRONTEND_URL="https://seudominio.com"
```

### B. Configurações de Segurança

```javascript
// Helmet para headers de segurança
app.use(helmet());

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
  })
);

// HTTPS redirect
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}
```

### C. Monitoramento

```javascript
// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error tracking (Sentry, Bugsnag, etc.)
```

### D. Deploy

```bash
# Build
npm run build

# Executar migrações em produção
npx prisma migrate deploy

# Iniciar aplicação
npm start
```

---

## 🎯 Checklist de Testes

### Backend API

- [ ] Health check funcionando
- [ ] Autenticação (login/logout)
- [ ] Registro de nova estética
- [ ] CRUD de serviços
- [ ] CRUD de agendamentos
- [ ] Gestão de clientes e veículos
- [ ] Upload de imagens
- [ ] WhatsApp integration

### Stripe Integration

- [ ] Criação de sessão de checkout
- [ ] Webhook recebendo eventos
- [ ] Status de assinatura atualizado
- [ ] Trials funcionando
- [ ] Renovações automáticas

### Frontend-Backend

- [ ] Login integrado
- [ ] Dashboard carregando dados
- [ ] Formulários salvando no backend
- [ ] Imagens sendo carregadas
- [ ] Notificações em tempo real

### Produção

- [ ] HTTPS configurado
- [ ] Domínio personalizado
- [ ] Backup do banco de dados
- [ ] Monitoramento configurado
- [ ] Logs centralizados

---

## 🆘 Troubleshooting

### Erro: "Stripe não inicializado"

**Solução**: Verifique se `STRIPE_SECRET_KEY` está no .env

### Erro: "Tenant não encontrado"

**Solução**: Certifique-se que o middleware de tenant está configurado

### Erro: "JWT malformed"

**Solução**: Verifique se o token está sendo enviado corretamente

### Webhook não funcionando

**Solução**: Use ngrok para expor localhost para Stripe em desenvolvimento

```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta 3000
ngrok http 3000

# Use a URL https do ngrok no webhook do Stripe
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do console
2. Teste cada endpoint individualmente
3. Valide as configurações do .env
4. Consulte a documentação do Stripe
5. Use as ferramentas de debug do navegador
