const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require("discord.js");
const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages 
    ],
    partials: [Partials.Channel]
});
const fs = require("fs");
const path = require("path");
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());
const User = require("../model/user.js"); 

const log = require("../structs/log.js");

// Exportar funciones para usar desde oauth.js
module.exports = {
    sendBanNotification: async (discordId, reason) => {
        try {
            const user = await client.users.fetch(discordId);
            const banEmbed = new EmbedBuilder()
                .setTitle('🚫 Tu cuenta ha sido suspendida')
                .setDescription(`Has sido baneado de **Project Leilos**.`)
                .setColor(0xFF0000)
                .addFields(
                    { name: '📝 Motivo', value: `\`${reason || 'No especificado'}\`` },
                    { name: '⚖️ Apelaciones', value: 'Si crees que esto es un error, puedes intentar apelar usando el botón de abajo.' }
                )
                .setFooter({ text: 'Sistema de Seguridad Leilos' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('appeal_ban')
                        .setLabel('Apelar Baneo')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('view_ban_details')
                        .setLabel('Detalles')
                        .setStyle(ButtonStyle.Secondary)
                );

            await user.send({ embeds: [banEmbed], components: [row] });
            return true;
        } catch (e) {
            console.error(`[Discord] No se pudo enviar DM a ${discordId}:`, e.message);
            return false;
        }
    }
};

client.once("clientReady", () => {
    log.bot(`Logged in as ${client.user.tag}!`);
    log.bot("Commands are now managed via the Web Dashboard.");

    // Clear all existing commands
    client.application.commands.set([]);
});

client.on("interactionCreate", async interaction => {
    // Only handle Buttons and Modals (for appeals), but not chat commands
    if (interaction.isChatInputCommand()) {
        return interaction.reply({ 
            content: '❌ Los comandos de chat han sido desactivados. Por favor, usa el Dashboard web: https://api.leilos.qzz.io/api/v2/discord/login', 
            flags: [64] 
        });
    }

    // Manejar Botones
    if (interaction.isButton()) {
        if (interaction.customId === 'view_ban_details') {
            const user = await User.findOne({ discordId: interaction.user.id });
            if (!user) return interaction.reply({ content: 'No se encontró tu cuenta.', flags: [64] });
            
            await interaction.reply({ 
                content: `🔍 **Detalles de tu sanción:**\n- **ID de Cuenta:** ${user.accountId}\n- **Motivo:** ${user.banReason || 'No especificado'}\n- **Fecha:** ${user.lastLogin ? user.lastLogin.toLocaleString() : 'N/A'}\n\nSi crees que es un error, usa el botón de Apelar.`, 
                flags: [64] 
            });
        }

        if (interaction.customId === 'appeal_ban') {
            const modal = new ModalBuilder()
                .setCustomId('appeal_modal')
                .setTitle('Formulario de Apelación');

            const appealInput = new TextInputBuilder()
                .setCustomId('appeal_reason')
                .setLabel('¿Por qué deberíamos desbanearte?')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explica tu situación aquí...')
                .setRequired(true)
                .setMinLength(10);

            const row = new ActionRowBuilder().addComponents(appealInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }

        // Manejar Botones de Admin (Desbanear desde el canal de apelaciones)
        if (interaction.customId.startsWith('unban_')) {
            const discordId = interaction.customId.split('_')[1];
            const moderators = config.moderators || [];
            const isAdmin = moderators.includes(interaction.user.id) || 
                            interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

            if (!isAdmin) return interaction.reply({ content: 'No tienes permiso.', flags: [64] });

            const user = await User.findOneAndUpdate({ discordId }, { banned: false, banReason: '' });
            
            if (user) {
                await interaction.reply({ content: `✅ El usuario **${user.username}** ha sido desbaneado con éxito.` });
                try {
                    const discordUser = await client.users.fetch(discordId);
                    await discordUser.send('✅ Tu apelación ha sido aceptada. ¡Tu cuenta de **Leilos** ha sido desbaneada!');
                } catch (e) {}
            }
        }

        if (interaction.customId.startsWith('deny_appeal_')) {
            const discordId = interaction.customId.split('_')[1];
            await interaction.reply({ content: `❌ Apelación rechazada para el usuario <@${discordId}>.`, flags: [64] });
        }
    }

    // Manejar Modales (Apelaciones)
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'appeal_modal') {
            const reason = interaction.fields.getTextInputValue('appeal_reason');
            const appealChannelId = '1482346680325247029';
            
            try {
                const channel = await client.channels.fetch(appealChannelId);
                if (channel && channel.isTextBased()) {
                    const user = await User.findOne({ discordId: interaction.user.id });
                    
                    const appealEmbed = new EmbedBuilder()
                        .setTitle('⚖️ Nueva Apelación de Baneo')
                        .setColor(0xFFFF00)
                        .setThumbnail(interaction.user.displayAvatarURL())
                        .addFields(
                            { name: '👤 Usuario', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                            { name: '🆔 Account ID', value: `\`${user?.accountId || 'N/A'}\``, inline: true },
                            { name: '📝 Razón de Apelación', value: `\`\`\`${reason}\`\`\`` },
                            { name: '🚫 Motivo del Ban', value: `\`${user?.banReason || 'No especificado'}\`` }
                        )
                        .setFooter({ text: 'Project Leilos | Sistema de Apelaciones' })
                        .setTimestamp();

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`unban_${interaction.user.id}`)
                                .setLabel('Aceptar (Desbanear)')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`deny_appeal_${interaction.user.id}`)
                                .setLabel('Rechazar Apelación')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await channel.send({ embeds: [appealEmbed], components: [row] });
                }
            } catch (e) {
                console.error('[Discord] Error enviando apelación al canal:', e);
            }

            await interaction.reply({ 
                content: '✅ Tu apelación ha sido enviada al canal de administración. Por favor, espera a que un moderador la revise.', 
                flags: [64] 
            });
        }
    }
});

client.login(config.discord.bot_token);