# 🚀 Início Rápido - SaaS Estética Automotiva

## ⚡ Setup em 5 Minutos

### 1. 📋 Pré-requisitos

- Node.js (v18+)
- PostgreSQL rodando
- Conta no Stripe (opcional para testes básicos)

### 2. 🔧 Configuração Inicial

```bash
# 1. Instalar dependências
npm install

# 2. Configurar banco de dados
npx prisma migrate dev --name init
npx prisma generate

# 3. Setup dados iniciais (cria planos, usuários de teste, etc.)
npm run setup

# 4. Iniciar servidor
npm run dev
```

### 3. ✅ Testar se está funcionando

```bash
# Em outro terminal, testar todos os endpoints
npm run test-api
```

Se todos os testes passarem, sua API está 100% funcional! 🎉

---

## 🧪 Testes Específicos

### Testar Backend Básico

```bash
# Verificar se servidor está respondendo
curl http://localhost:3000

# Listar planos disponíveis
curl http://localhost:3000/api/public/subscription-plans
```

### Testar Stripe (depois de configurar)

```bash
# 1. Configure suas chaves no .env:
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...

# 2. Teste a integração
npm run test-stripe
```

---

## 👥 Usuários de Teste Criados

### Super Admin (Gerencia todo o SaaS)

- **Email**: `admin@saasestetica.com`
- **Senha**: `admin123`
- **Acesso**: Gerenciar planos, tenants, etc.

### Admin da Estética (Dono da estética)

- **Email**: `admin@autoshine.com`
- **Senha**: `admin123`
- **Estética**: AutoShine Estética
- **Acesso**: Gerenciar sua estética

---

## 🔗 Endpoints Principais

### Públicos (sem autenticação)

```http
GET    /api/public/subscription-plans     # Listar planos
POST   /api/public/register               # Registrar nova estética
```

### Autenticação

```http
POST   /api/auth/login                    # Login
POST   /api/auth/logout                   # Logout
```

### Tenant (com autenticação)

```http
GET    /api/services                      # Listar serviços
POST   /api/services                      # Criar serviço
GET    /api/bookings                      # Listar agendamentos
POST   /api/bookings                      # Criar agendamento
GET    /api/vehicles                      # Listar veículos
```

### Pagamentos

```http
POST   /api/payments/create-checkout-session   # Criar sessão Stripe
POST   /api/payments/webhook                   # Webhook Stripe
GET    /api/payments/subscription-status       # Status assinatura
```

---

## 🌐 Testando com Frontend

### Se você tem um frontend React/Next.js:

1. **Configure a URL da API**:

```javascript
const API_URL = "http://localhost:3000/api";
```

2. **Exemplo de login**:

```javascript
const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }
  return data;
};
```

3. **Exemplo de requisição autenticada**:

```javascript
const getServices = async () => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/services`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
};
```

---

## 💳 Testando Pagamentos Stripe

### 1. Configurar Stripe (Modo Teste)

```bash
# 1. Criar conta em https://stripe.com
# 2. Ir em Developers > API Keys
# 3. Copiar chaves de teste para .env
# 4. Configurar webhook para /api/payments/webhook
```

### 2. Fluxo de Teste

```bash
# 1. Registrar nova estética
curl -X POST http://localhost:3000/api/public/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Teste Pagamento",
    "ownerName": "João",
    "email": "teste@pagamento.com",
    "password": "123456",
    "planId": "ID_DO_PLANO_BASICO"
  }'

# 2. Fazer login e criar sessão de pagamento
# (use o token retornado no passo anterior)

# 3. Acessar URL de checkout retornada
# 4. Usar cartão teste: 4242 4242 4242 4242
```

---

## 🚨 Troubleshooting

### "Erro: connect ECONNREFUSED"

- **Problema**: PostgreSQL não está rodando
- **Solução**: `sudo service postgresql start` (Linux) ou iniciar via pgAdmin

### "Prisma Client not generated"

- **Problema**: Cliente Prisma não foi gerado
- **Solução**: `npx prisma generate`

### "Table doesn't exist"

- **Problema**: Migrações não foram executadas
- **Solução**: `npx prisma migrate dev`

### "JWT must be provided"

- **Problema**: Token não está sendo enviado
- **Solução**: Verificar header `Authorization: Bearer TOKEN`

### "Stripe error: No API key provided"

- **Problema**: Chave do Stripe não configurada
- **Solução**: Adicionar `STRIPE_SECRET_KEY` no .env

---

## 📚 Próximos Passos

### Para Development

1. ✅ Configure o .env com suas chaves
2. ✅ Execute `npm run setup`
3. ✅ Execute `npm run test-api`
4. ✅ Integre com seu frontend
5. ✅ Configure Stripe
6. ✅ Teste fluxo completo

### Para Production

1. 🚀 Configure variáveis de produção
2. 🚀 Setup banco PostgreSQL de produção
3. 🚀 Configure domínio e HTTPS
4. 🚀 Configure webhook Stripe de produção
5. 🚀 Deploy em Vercel/Railway/Heroku
6. 🚀 Configure monitoramento

---

## 🎯 Status da Implementação

### ✅ Implementado e Funcionando

- [x] Autenticação multi-tenant
- [x] CRUD completo (serviços, agendamentos, clientes)
- [x] Integração Stripe
- [x] Webhooks de pagamento
- [x] Sistema de assinaturas
- [x] WhatsApp templates
- [x] Gestão financeira
- [x] Upload de arquivos
- [x] Dashboard com estatísticas

### 🔄 Para Melhorar (opcionais)

- [ ] Notificações em tempo real (WebSocket)
- [ ] Relatórios avançados
- [ ] Integração WhatsApp Business API
- [ ] Sistema de backup automático
- [ ] Analytics avançados

---

**🎉 Sua API está 100% funcional para produção!**

Qualquer dúvida, execute `npm run test-api` para verificar se tudo está funcionando corretamente.
