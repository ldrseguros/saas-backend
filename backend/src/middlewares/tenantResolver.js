import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const resolveTenantId = async (req, res, next) => {
    // --- NOVAS LOGS AQUI ---
    const hostHeader = req.headers.host;
    const xTenantIdHeader = req.headers['x-tenant-id'];
    const originHeader = req.headers.origin;
    const refererHeader = req.headers.referer;

    console.log(`[TenantResolver - Headers] Requisição para: ${req.method} ${req.url}`);
    console.log(`[TenantResolver - Headers] Host Header: '${hostHeader || 'N/A'}'`);
    console.log(`[TenantResolver - Headers] X-Tenant-ID Header: '${xTenantIdHeader || 'N/A'}'`);
    console.log(`[TenantResolver - Headers] Origin Header: '${originHeader || 'N/A'}'`);
    console.log(`[TenantResolver - Headers] Referer Header: '${refererHeader || 'N/A'}'`);
    // --- FIM DAS NOVAS LOGS ---

    const host = req.hostname; // req.hostname pode ser diferente de req.headers.host (não inclui a porta)
    const baseDomain = process.env.BASE_DOMAIN || 'localhost';

    let subdomain = null;

    if (host.includes(baseDomain) && host !== baseDomain) {
        subdomain = host.substring(0, host.indexOf(`.${baseDomain}`));
    } else if (host.includes(':')) {
        const parts = host.split('.');
        // Adicionando uma verificação para garantir que 'parts' tem elementos suficientes
        // e que parts[0] não é o domínio base se ele for diretamente localhost ou meusaas.com.br
        if (parts.length > 1 && parts[0] !== 'localhost' && !parts[0].includes(':') && parts[0] !== baseDomain.split('.')[0]) {
             subdomain = parts[0];
        } else if (host.startsWith('localhost:')) { // Caso específico para localhost com porta, onde o subdomínio pode não ser detectado corretamente
            console.log(`[TenantResolver] Host é localhost com porta, tentando extrair de X-Tenant-ID se disponível.`);
            subdomain = xTenantIdHeader; // Tenta usar o X-Tenant-ID como fallback para localhost
        }
    }
    // Adicionando um fallback se o subdomínio ainda não foi detectado mas X-Tenant-ID existe
    if (!subdomain && xTenantIdHeader && xTenantIdHeader !== 'null') { // Verifique se não é string "null"
        console.log(`[TenantResolver] Subdomínio não detectado pelo host, usando X-Tenant-ID: '${xTenantIdHeader}' como fallback.`);
        subdomain = xTenantIdHeader;
    }


    console.log(`[TenantResolver] Host usado para lógica: '${host}', Subdomínio detectado pela lógica: '${subdomain}'`);
    console.log(`[TenantResolver] Base Domain configurado: '${baseDomain}'`);


    if (!subdomain || subdomain === 'www') {
        console.warn("[TenantResolver] Subdomínio não detectado ou inválido (após toda a lógica).");
        req.tenantId = null;
        return next(); // Continua para o próximo middleware, mas sem tenantId
    }

    try {
        const tenant = await prisma.tenant.findUnique({ where: { subdomain: subdomain } });

        if (tenant) {
            req.tenantId = tenant.id;
            console.log(`[TenantResolver] Subdomínio '${subdomain}' resolvido para Tenant ID: '${tenant.id}'`);
        } else {
            console.warn(`[TenantResolver] Nenhum tenant encontrado para o subdomínio: '${subdomain}'.`);
            req.tenantId = null; // Nenhum tenant, continua mas sem tenantId
        }
    } catch (error) {
        console.error("[TenantResolver] Erro ao consultar o banco de dados para tenant:", error);
        req.tenantId = null;
        // Não retorne um 500 aqui, apenas log e continue, a menos que seja um erro crítico de banco de dados
        // que impeça a aplicação de funcionar. Outros middlewares podem lidar com a falta de tenantId.
    }

    next();
};