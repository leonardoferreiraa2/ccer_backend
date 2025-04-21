const Sala = require('../models/Sala');
const upload = require('../middlewares/upload');
const fs = require('fs').promises;
const path = require('path');

const formatDate = (date) => new Date(date).toISOString();

const listSalas = async (req, res, next) => {
  try {
    const { page = 1, perPage = 10, search = '' } = req.query;
    const result = await Sala.list({ page, perPage, search });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

const getSala = async (req, res, next) => {
  try {
    const { id } = req.params;
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
    next(error);
  }
};

const createSala = [
  upload.single('foto'),
  async (req, res, next) => {
    try {
      const { titulo, descricao } = req.body;
      const foto = req.file;

      if (!titulo || !descricao || !foto) {
        if (foto) await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(400).json({
          success: false,
          code: 'CAMPOS_OBRIGATORIOS',
          message: 'Todos os campos (Título, Descrição, Foto) são obrigatórios',
          fields: {
            titulo: !titulo ? 'Campo obrigatório' : undefined,
            descricao: !descricao ? 'Campo obrigatório' : undefined,
            foto: !foto ? 'Campo obrigatório' : undefined
          }
        });
      }

      if (foto.size > 5 * 1024 * 1024) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(413).json({
          success: false,
          code: 'ARQUIVO_GRANDE',
          message: 'O arquivo excede o tamanho máximo de 5MB'
        });
      }

      const existeSala = await Sala.findByTitle(titulo);
      if (existeSala) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(400).json({
          success: false,
          code: 'TITULO_EXISTENTE',
          message: 'Já existe uma sala com este título'
        });
      }

      const salaData = { 
        titulo, 
        descricao, 
        foto: foto.filename 
      };
      
      const sala = await Sala.create(salaData);
      
      res.status(201).json({
        success: true,
        data: {
          id: sala.id,
          titulo: sala.titulo,
          descricao: sala.descricao,
          foto: sala.foto,
          updated_at: formatDate(sala.updated_at)
        }
      });
    } catch (error) {
      if (req.file) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', req.file.filename))
          .catch(cleanupErr => console.error('Erro ao limpar arquivo:', cleanupErr));
      }
      next(error);
    }
  }
];

const updateSala = [
  upload.single('foto'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { titulo, descricao } = req.body;
      const foto = req.file;

      const isUpdating = titulo !== undefined || descricao !== undefined || foto;
      
      if (!isUpdating) {
        if (foto) await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(400).json({
          success: false,
          code: 'NENHUMA_ALTERACAO',
          message: 'Nenhum campo enviado para atualização'
        });
      }

      if (foto && foto.size > 5 * 1024 * 1024) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(413).json({
          success: false,
          code: 'ARQUIVO_GRANDE',
          message: 'O arquivo excede o tamanho máximo de 5MB'
        });
      }

      const existingSala = await Sala.findById(id);
      if (!existingSala) {
        if (foto) await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(404).json({
          success: false,
          code: 'SALA_NAO_ENCONTRADA',
          message: 'Sala não encontrada'
        });
      }

      if (titulo && titulo !== existingSala.titulo) {
        const salaComMesmoTitulo = await Sala.findByTitle(titulo, id);
        if (salaComMesmoTitulo) {
          if (foto) await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
          return res.status(400).json({
            success: false,
            code: 'TITULO_EXISTENTE',
            message: 'Já existe uma sala com este título'
          });
        }
      }

      let previousPhotoPath = null;
      if (foto && existingSala.foto) {
        previousPhotoPath = path.join(__dirname, '..', 'uploads', existingSala.foto);
      }

      const updates = {
        ...(titulo !== undefined && { titulo }),
        ...(descricao !== undefined && { descricao }),
        ...(foto && { foto: foto.filename }),
        updated_at: new Date()
      };

      const updatedSala = await Sala.update(id, updates);

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
      next(error);
    }
  }
];

const deleteSala = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sala = await Sala.findById(id);
    
    if (!sala) {
      return res.status(404).json({
        success: false,
        code: 'SALA_NAO_ENCONTRADA',
        message: 'Sala não encontrada'
      });
    }

    if (sala.foto) {
      const fotoPath = path.join(__dirname, '..', 'uploads', sala.foto);
      await fs.unlink(fotoPath)
        .catch(err => {
          if (err.code !== 'ENOENT') {
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
    next(error);
  }
};

const getSalaImage = async (req, res, next) => {
  try {
    const { id } = req.params;
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
      data: { imageUrl }
    });
  } catch (error) {
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