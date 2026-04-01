const { MessageEmbed } = require("discord.js");
const functions = require("../../structs/functions.js");

module.exports = {
    commandInfo: {
        name: "create",
        description: "Create a new account on Leilos.",
        options: [
            {
                name: "id",
                description: "¿Qué ID quieres tener? (Esto se usará para tu correo @leilos.tf)",
                required: true,
                type: 3 // string
            },
            {
                name: "username",
                description: "Your username.",
                required: true,
                type: 3
            },
            {
                name: "password",
                description: "Your password.",
                required: true,
                type: 3
            }
        ],
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const { options } = interaction;

        const discordId = interaction.user.id;
        const customId = options.get("id").value;
        const username = options.get("username").value;
        const password = options.get("password").value;

        // Validar que el ID no tenga caracteres raros
        const allowedIdChars = /^[a-zA-Z0-9_.-]+$/;
        if (!allowedIdChars.test(customId)) {
            return interaction.editReply({ content: "Tu ID solo puede contener letras, números, puntos, guiones y guiones bajos.", ephemeral: true });
        }

        const email = `${customId}@leilos.tf`.toLowerCase();

        await functions.registerUser(discordId, username, email, password).then(resp => {
            let embed = new MessageEmbed()
            .setColor(resp.status >= 400 ? "#ff0000" : "#56ff00")
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL() })
            .setFields(
                { name: 'Message', value: resp.message },
            )
            .setTimestamp()

            if (resp.status >= 400) return interaction.editReply({ embeds: [embed], ephemeral: true });

            (interaction.channel ? interaction.channel : interaction.user).send({ embeds: [embed] });
            interaction.editReply({ content: "You successfully created an account!", ephemeral: true });
        });
    }
}