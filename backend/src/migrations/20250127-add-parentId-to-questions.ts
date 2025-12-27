import { QueryInterface, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface) => {
        await queryInterface.addColumn('questions', 'parentId', {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'questions',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
        });
    },

    down: async (queryInterface: QueryInterface) => {
        await queryInterface.removeColumn('questions', 'parentId');
    },
};
