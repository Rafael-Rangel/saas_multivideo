-- Adicionar campos domain_name e ssl_email na tabela vps_configs
-- Necessários para configuração SSL automática via Let's Encrypt

ALTER TABLE vps_configs
ADD COLUMN IF NOT EXISTS domain_name TEXT,
ADD COLUMN IF NOT EXISTS ssl_email TEXT;

-- Comentários para documentação
COMMENT ON COLUMN vps_configs.domain_name IS 'Domínio para gerar certificados SSL (ex: exemplo.com)';
COMMENT ON COLUMN vps_configs.ssl_email IS 'Email para certificados SSL Let''s Encrypt';

