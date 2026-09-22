const User = require('../../models/User');

// Obtener todos los usuarios (solo admin)
const getAllUsers = async (req, res) => {
  try {
    console.log('📡 Obteniendo todos los usuarios...');
    
    const users = await User.findAll();
    
    console.log(`✅ ${users.length} usuarios encontrados`);
    
    res.json({
      success: true,
      data: users,
      total: users.length
    });

  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener usuario por ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    console.log(`📡 Buscando usuario con ID: ${id}`);
    
    const user = await User.findById(parseInt(id));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    console.log(`✅ Usuario encontrado: ${user.nombre}`);
    
    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Actualizar usuario (admin o el mismo usuario)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, avatar, role } = req.body;
    
    // Validar ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    const userId = parseInt(id);
    
    // Verificar que el usuario existe
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar permisos: admin o el mismo usuario
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === userId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para actualizar este usuario'
      });
    }

    // Si no es admin, no puede cambiar el rol
    if (!isAdmin && role && role !== existingUser.role) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para cambiar roles'
      });
    }

    // Validar email si se está cambiando
    if (email && email !== existingUser.email) {
      const emailExists = await User.emailExists(email, userId);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          error: 'El email ya está en uso por otro usuario'
        });
      }
    }

    console.log(`📡 Actualizando usuario ID: ${userId}`);
    
    // Actualizar usuario
    const updatedUser = await User.update(userId, {
      nombre: nombre || existingUser.nombre,
      email: email || existingUser.email,
      avatar: avatar || existingUser.avatar,
      role: (isAdmin && role) ? role : existingUser.role
    });

    if (updatedUser) {
      console.log(`✅ Usuario actualizado: ${updatedUser.nombre}`);
      
      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: updatedUser
      });
    } else {
      throw new Error('No se pudo actualizar el usuario');
    }

  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Cambiar estado de usuario (activar/desactivar) - solo admin
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    const userId = parseInt(id);
    
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        error: 'No puedes desactivar tu propia cuenta'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    console.log(`📡 Cambiando estado del usuario ${user.nombre} de ${user.is_active} a ${!user.is_active}`);
    
    // ✅ USAR EL NUEVO MÉTODO ESPECÍFICO
    const updatedUser = await User.updateStatus(userId, !user.is_active);

    if (updatedUser) {
      console.log(`✅ Estado actualizado correctamente: ${updatedUser.nombre} - ${updatedUser.is_active ? 'activo' : 'inactivo'}`);
      
      res.json({
        success: true,
        message: `Usuario ${updatedUser.is_active ? 'activado' : 'desactivado'} exitosamente`,
        data: updatedUser
      });
    } else {
      throw new Error('No se pudo actualizar el estado');
    }

  } catch (error) {
    console.error('❌ Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
// Eliminar usuario (soft delete) - solo admin
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    const userId = parseInt(id);
    
    // No puede eliminarse a sí mismo
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta'
      });
    }

    // Buscar usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    console.log(`📡 Eliminando usuario: ${user.nombre}`);
    
    // Soft delete
    const deletedUser = await User.delete(userId);

    if (deletedUser) {
      console.log(`✅ Usuario eliminado: ${user.nombre}`);
      
      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente',
        data: deletedUser
      });
    } else {
      throw new Error('No se pudo eliminar el usuario');
    }

  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Buscar usuarios
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Término de búsqueda requerido'
      });
    }

    const searchTerm = q.trim();
    console.log(`🔍 Buscando usuarios con término: ${searchTerm}`);

    const users = await User.search(searchTerm);
    
    console.log(`✅ ${users.length} usuarios encontrados`);

    res.json({
      success: true,
      data: users,
      total: users.length,
      searchTerm: searchTerm
    });

  } catch (error) {
    console.error('❌ Error en búsqueda de usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de usuarios - solo admin
const getUserStats = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas de usuarios...');
    
    const stats = await User.getStats();
    
    console.log('✅ Estadísticas obtenidas');
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  searchUsers,
  getUserStats
};