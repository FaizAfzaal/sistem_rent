const { sequelize, User } = require('./src/models');
const { Op } = require('sequelize');

const cleanUsers = async () => {
  try {
    await sequelize.authenticate();
    const deleted = await User.destroy({
      where: {
        email: { [Op.ne]: 'admin@rental.com' }
      }
    });
    console.log(`✅ Hapus user selain admin selesai. Total user dihapus: ${deleted}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error cleanUsers:', err.message);
    process.exit(1);
  }
};

cleanUsers();
