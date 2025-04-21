const Sala = require('../models/Sala');
const upload = require('../middlewares/upload');
const fs = require('fs').promises;
const path = require('path');
const cache = require('../config/cache');

const format = ts => new Date(ts).toLocaleString('pt-BR', { hour12: false }).replace(',', '');

const clearSalasCache = async () => {
  await cache.del('salas:list');
};

const listSalas = async (req, res, next) => {
  try {
    const { page = 1, perPage = 10, search = '' } = req.query;
    const cacheKey = `salas:list:${page}:${perPage}:${search}`;
    
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const result = await Sala.list({ page, perPage, search });
    await cache.set(cacheKey, result, 300); // Cache por 5 minutos
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getSala = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `sala:${id}`;
    
    const cachedSala = await cache.get(cacheKey);
    if (cachedSala) {
      return res.json(cachedSala);
    }

    const sala = await Sala.findById(id);
    
    if (!sala) {
      return res.status(404).json({ message: 'Sala não encontrada' });
    }
    
    await cache.set(cacheKey, sala, 3600); // Cache por 1 hora
    res.json(sala);
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
        return res.status(400).json({ 
          message: 'Todos os campos (titulo, descricao, foto) são obrigatórios' 
        });
      }

      const existeSala = await Sala.findByTitle(titulo);
      if (existeSala) {
        await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        return res.status(400).json({ message: 'Já existe uma sala com este título' });
      }

      const salaData = { titulo, descricao, foto: foto.filename };
      const sala = await Sala.create(salaData);
      
      await clearSalasCache();
      
      res.status(201).json({
        id: sala.id,
        titulo: sala.titulo,
        descricao: sala.descricao,
        foto: sala.foto,
        updated_at: format(sala.updated_at)
      });
    } catch (error) {
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

      const isUpdating = typeof titulo !== 'undefined' || 
                        typeof descricao !== 'undefined' || 
                        !!foto;
      
      if (!isUpdating) {
        return res.status(400).json({ 
          message: 'Envie pelo menos um campo para atualização (Título, Descrição ou Foto)' 
        });
      }

      if ((typeof titulo !== 'undefined' && !titulo.trim()) || 
          (typeof descricao !== 'undefined' && !descricao.trim())) {
        return res.status(400).json({ 
          message: 'Campos não podem estar vazios quando enviados para atualização' 
        });
      }

      const existingSala = await Sala.findById(id);
      if (!existingSala) {
        if (foto) {
          await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        }
        return res.status(404).json({ message: 'Sala não encontrada' });
      }

      if (titulo && titulo !== existingSala.titulo) {
        const salaComMesmoTitulo = await Sala.findByTitle(titulo, id);
        if (salaComMesmoTitulo) {
          if (foto) {
            await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
          }
          return res.status(400).json({ message: 'Já existe uma sala com este título' });
        }
      }

      let previousPhotoPath = null;
      if (foto && existingSala.foto) {
        previousPhotoPath = path.join(__dirname, '..', 'uploads', existingSala.foto);
      }

      const updates = {
        ...(typeof titulo !== 'undefined' && { titulo }),
        ...(typeof descricao !== 'undefined' && { descricao }),
        ...(foto && { foto: foto.filename })
      };

      const updatedSala = await Sala.update(id, updates);
      
      await clearSalasCache();
      await cache.del(`sala:${id}`);

      if (previousPhotoPath) {
        try {
          await fs.unlink(previousPhotoPath);
        } catch (err) {
          console.error('Erro ao remover foto anterior:', err);
        }
      }

      res.json({
        id: updatedSala.id,
        titulo: updatedSala.titulo,
        descricao: updatedSala.descricao,
        foto: updatedSala.foto,
        updated_at: format(updatedSala.updated_at) 
      });

    } catch (error) {
      if (foto) {
        try {
          await fs.unlink(path.join(__dirname, '..', 'uploads', foto.filename));
        } catch (cleanupErr) {
          console.error('Erro ao limpar arquivo novo após falha:', cleanupErr);
        }
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
      return res.status(404).json({ message: 'Sala não encontrada' });
    }

    if (sala.foto) {
      const fotoPath = path.join(__dirname, '..', 'uploads', sala.foto);
      
      try {
        await fs.unlink(fotoPath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    }

    await Sala.delete(id);
    
    await clearSalasCache();
    await cache.del(`sala:${id}`);
    
    res.json({ message: 'Sala e foto associada excluídas com sucesso' });

  } catch (error) {
    next(error);
  }
};

const getSalaImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `sala:image:${id}`;
    
    const cachedUrl = await cache.get(cacheKey);
    if (cachedUrl) {
      return res.json({ imageUrl: cachedUrl });
    }

    const imageUrl = await Sala.getImageUrl(id);
    
    if (!imageUrl) {
      return res.status(404).json({ message: 'Imagem não encontrada' });
    }
    
    await cache.set(cacheKey, imageUrl, 86400); // Cache por 24 horas
    res.json({ imageUrl });
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