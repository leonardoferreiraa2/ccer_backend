const Sala = require('../models/Sala');
const upload = require('../middlewares/upload');
const fs = require('fs').promises;
const path = require('path');

// Formata data para ISO 8601
const formatDate = (date) => new Date(date).toISOString();

// Configura permissões de arquivo (644 = rw-r--r--)
const setFilePermissions = async (filePath) => {
  try {
    await fs.chmod(filePath, 0o644);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro nas permissões de ${filePath}:`, err);
  }
};

/**
 * Lista salas com paginação
 * @route GET /api/salas
 */
const listSalas = async (req, res, next) => {
  try {
    const { page = 1, perPage = 10, search = '' } = req.query;
    
    // Validação numérica
    const pageNumber = Math.max(1, parseInt(page)) || 1;
    const perPageNumber = Math.max(1, parseInt(perPage)) || 10;

    const result = await Sala.list({ 
      page: pageNumber, 
      perPage: perPageNumber, 
      search 
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao listar salas:`, error);
    next(error);
  }
};

/**
 * Busca sala por ID
 * @route GET /api/salas/:id
 */
const getSala = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || id.length !== 36) {
      return res.status(400).json({
        success: false,
        code: 'ID_INVALIDO',
        message: 'ID da sala inválido'
      });
    }

    const sala = await Sala.findById(id);
    
    if (!sala) {
      return res.status(404).json({
        success: false,
        code: 'SALA_NAO_ENCONTRADA',
        message: 'Sala não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: sala
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao buscar sala ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Cria nova sala com upload de foto
 * @route POST /api/salas
 */
const createSala = [
  upload.single('foto'),
  async (req, res, next) => {
    try {
      const { titulo, descricao } = req.body;
      const foto = req.file;

      // Validação de campos obrigatórios
      if (!titulo || !descricao || !foto) {
        if (foto) {
          await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename))
            .catch(err => console.error('Erro ao limpar arquivo inválido:', err));
        }
        return res.status(400).json({
          success: false,
          code: 'CAMPOS_OBRIGATORIOS',
          message: 'Todos os campos são obrigatórios',
          fields: {
            titulo: !titulo ? 'Campo obrigatório' : undefined,
            descricao: !descricao ? 'Campo obrigatório' : undefined,
            foto: !foto ? 'Campo obrigatório' : undefined
          }
        });
      }

      // Validação de tamanho de arquivo (5MB máximo)
      if (foto.size > 5 * 1024 * 1024) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(413).json({
          success: false,
          code: 'ARQUIVO_GRANDE',
          message: 'O arquivo excede o tamanho máximo de 5MB'
        });
      }

      // Validação de título único
      const existeSala = await Sala.findByTitle(titulo);
      if (existeSala) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(409).json({
          success: false,
          code: 'TITULO_EXISTENTE',
          message: 'Já existe uma sala com este título'
        });
      }

      // Criação da sala
      const salaData = { 
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        foto: foto.filename 
      };
      
      const sala = await Sala.create(salaData);
      await setFilePermissions(path.join(__dirname, '..', 'uploads', foto.filename));

      res.status(201).json({
        success: true,
        data: {
          id: sala.id,
          titulo: sala.titulo,
          descricao: sala.descricao,
          foto: sala.foto,
          created_at: formatDate(sala.created_at),
          updated_at: formatDate(sala.updated_at)
        }
      });
    } catch (error) {
      if (req.file) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', req.file.filename))
          .catch(cleanupErr => console.error('Erro ao limpar arquivo:', cleanupErr));
      }
      console.error(`[${new Date().toISOString()}] Erro ao criar sala:`, error);
      next(error);
    }
  }
];

/**
 * Atualiza sala existente
 * @route PUT /api/salas/:id
 */
const updateSala = [
  upload.single('foto'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { titulo, descricao } = req.body;
      const foto = req.file;

      // Verifica se há campos para atualizar
      const isUpdating = titulo !== undefined || descricao !== undefined || foto;
      
      if (!isUpdating) {
        if (foto) await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(400).json({
          success: false,
          code: 'NENHUMA_ALTERACAO',
          message: 'Nenhum campo enviado para atualização'
        });
      }

      // Validação de tamanho de arquivo
      if (foto && foto.size > 5 * 1024 * 1024) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(413).json({
          success: false,
          code: 'ARQUIVO_GRANDE',
          message: 'O arquivo excede o tamanho máximo de 5MB'
        });
      }

      // Verifica existência da sala
      const existingSala = await Sala.findById(id);
      if (!existingSala) {
        if (foto) await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(404).json({
          success: false,
          code: 'SALA_NAO_ENCONTRADA',
          message: 'Sala não encontrada'
        });
      }

      // Valida título único (se foi alterado)
      if (titulo && titulo !== existingSala.titulo) {
        const salaComMesmoTitulo = await Sala.findByTitle(titulo, id);
        if (salaComMesmoTitulo) {
          if (foto) await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
          return res.status(409).json({
            success: false,
            code: 'TITULO_EXISTENTE',
            message: 'Já existe uma sala com este título'
          });
        }
      }

      // Remove foto antiga se uma nova foi enviada
      let previousPhotoPath = null;
      if (foto && existingSala.foto) {
        previousPhotoPath = path.join(__dirname, '..', 'uploads', existingSala.foto);
      }

      // Prepara atualizações
      const updates = {
        ...(titulo !== undefined && { titulo: titulo.trim() }),
        ...(descricao !== undefined && { descricao: descricao.trim() }),
        ...(foto && { foto: foto.filename }),
        updated_at: new Date()
      };

      // Executa atualização
      const updatedSala = await Sala.update(id, updates);
      
      // Define permissões para a nova foto
      if (foto) {
        await setFilePermissions(path.join(__dirname, '..', 'uploads', foto.filename));
      }

      // Remove foto antiga após sucesso
      if (previousPhotoPath) {
        await fs.unlink(previousPhotoPath)
          .catch(err => console.error('Erro ao remover foto anterior:', err));
      }

      res.status(200).json({
        success: true,
        data: {
          id: updatedSala.id,
          titulo: updatedSala.titulo,
          descricao: updatedSala.descricao,
          foto: updatedSala.foto,
          updated_at: formatDate(updatedSala.updated_at)
        }
      });
    } catch (error) {
      if (req.file) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', req.file.filename))
          .catch(cleanupErr => console.error('Erro ao limpar arquivo:', cleanupErr));
      }
      console.error(`[${new Date().toISOString()}] Erro ao atualizar sala ${req.params.id}:`, error);
      next(error);
    }
  }
];

/**
 * Exclui uma sala
 * @route DELETE /api/salas/:id
 */
const deleteSala = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validação de ID
    if (!id || id.length !== 36) {
      return res.status(400).json({
        success: false,
        code: 'ID_INVALIDO',
        message: 'ID da sala inválido'
      });
    }

    const sala = await Sala.findById(id);
    if (!sala) {
      return res.status(404).json({
        success: false,
        code: 'SALA_NAO_ENCONTRADA',
        message: 'Sala não encontrada'
      });
    }

    // Remove a foto associada se existir
    if (sala.foto) {
      const fotoPath = path.join(__dirname, '..', 'uploads', sala.foto);
      await fs.unlink(fotoPath)
        .catch(err => {
          if (err.code !== 'ENOENT') { // Ignora se o arquivo já não existir
            console.error('Erro ao remover foto:', err);
          }
        });
    }

    await Sala.delete(id);
    
    res.status(200).json({
      success: true,
      message: 'Sala excluída com sucesso'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao excluir sala ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * Retorna a URL da imagem de uma sala
 * @route GET /api/salas/:id/image
 */
const getSalaImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || id.length !== 36) {
      return res.status(400).json({
        success: false,
        code: 'ID_INVALIDO',
        message: 'ID da sala inválido'
      });
    }

    const imageUrl = await Sala.getImageUrl(id);
    
    if (!imageUrl) {
      return res.status(404).json({
        success: false,
        code: 'IMAGEM_NAO_ENCONTRADA',
        message: 'Imagem não encontrada para esta sala'
      });
    }

    res.status(200).json({
      success: true,
      data: { 
        imageUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}`
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao buscar imagem da sala ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  listSalas,
  getSala,
  createSala,
  updateSala,
  deleteSala,
  getSalaImage
};