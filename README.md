Dicionário da API - Resumo Completo
Esta API é um sistema de gerenciamento de salas e usuários, com autenticação via JWT.

📌 Rotas da API
🔐 Autenticação (/api/auth)
Método	Rota	Descrição	Autenticação
POST	/login	Faz login e retorna um token JWT	❌ Pública
POST	/logout	Invalida o token do usuário	✅ Token
GET	/me	Retorna dados do usuário logado	✅ Token
📌 Como usar o Token JWT
Obtenção: Faça login em /api/auth/login → receba um token.

Uso: Envie no cabeçalho:

http
Authorization: Bearer <SEU_TOKEN>
Validade: 1 dia (configurável no .env).

Logout: Chamar /logout invalida o token no Redis.

👥 Usuários (/api/usuarios)
Método	Rota	Descrição	Permissão
GET	/	Lista usuários (paginação)	Apenas Admin
POST	/	Cria novo usuário	Apenas Admin
GET	/:id	Busca usuário por ID	Dono ou Admin
PUT	/:id	Atualiza usuário	Dono ou Admin
DELETE	/:id	Exclui usuário	Apenas Admin
📌 Fluxo de Usuários
Admin cria usuários (POST /api/usuarios).

Usuários podem:

Ver seu perfil (GET /api/usuarios/:id).

Atualizar seus dados (PUT /api/usuarios/:id).

Admin pode listar, editar e excluir qualquer usuário.

🚪 Salas (/api/salas)
Método	Rota	Descrição	Permissão
GET	/	Lista salas (paginação)	✅ Token
POST	/	Cria nova sala (com foto)	✅ Token
GET	/:id	Busca sala por ID	✅ Token
PUT	/:id	Atualiza sala (foto opcional)	✅ Token
DELETE	/:id	Exclui sala (e foto associada)	✅ Token
GET	/:id/image	Retorna URL da imagem	✅ Token
📌 Fluxo de Salas
Usuário autenticado pode:

Listar salas (GET /api/salas).

Criar salas com foto (POST /api/salas, multipart/form-data).

Atualizar/excluir salas (PUT/DELETE /api/salas/:id).

Fotos são salvas em ./uploads/.

📦 Dependências e Seus Significados
Pacote	Uso
express	Framework para criar a API
jsonwebtoken	Geração/validação de tokens JWT
bcryptjs	Criptografia de senhas
ioredis	Cache de tokens (evita logins duplicados)
knex + sqlite3	Banco de dados (SQLite) e queries
multer	Upload de imagens (fotos das salas)
dotenv	Gerenciamento de variáveis de ambiente
cors	Permite acesso de diferentes origens (frontend)
cookie-parser	Manipulação de cookies (opcional para tokens)
🛠️ Fluxo Geral da API
Autenticação:

Usuário faz POST /api/auth/login → recebe token.

Token é armazenado no Redis (validade 1 dia).

Requisições Autenticadas:

Todas as rotas (exceto login) exigem Authorization: Bearer <token>.

O middleware authMiddleware verifica o token no Redis.

Operações no Banco de Dados:

Usuários e salas são armazenados no SQLite.

Fotos são salvas no sistema de arquivos (./uploads).

Tratamento de Erros:

Erros são padronizados (ex.: 401 Unauthorized, 404 Not Found).

Mensagens claras (ex.: "SENHA_INVALIDA", "EMAIL_EXISTENTE").

🔧 Como Consumir Esta API (Exemplo com fetch)
1. Login (Obter Token)
javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@ccer.com', senha: 'Admin123@' })
});
const { token } = await response.json();
2. Requisição Autenticada (Listar Salas)
javascript
const response = await fetch('http://localhost:3000/api/salas', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const salas = await response.json();
📌 Conclusão (Metodologia de Desenvolvimento)
✅ Autenticação JWT → Tokens armazenados no Redis.
✅ CRUD de Usuários → Controle de permissões (Admin vs Usuário comum).
✅ Upload de Imagens → Salas com fotos (Multer + sistema de arquivos).
✅ Padronização de Respostas → { success, code, message, data }.
✅ Tratamento de Erros → Mensagens claras e códigos HTTP corretos.

Pronto para produção! 🚀

Frontend pode consumir via fetch/axios.

Backend está seguro e escalável.