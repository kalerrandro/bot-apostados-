# bot-apostados-
import discord
from discord.ext import commands
import os
import traceback

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents)

# ID do role @Administração - TROQUE PELO SEU REAL
ADMIN_ROLE_ID = 1464478188049793217  # exemplo - substitua pelo seu

@bot.event
async def on_ready():
    print(f'Bot online como {bot.user}! Pronto pra filas.')

@bot.command()
async def ping(ctx):
    await ctx.send('pong')

queues = {}  # (tipo.lower(), valor) → {'members': [], 'msg': msg_obj, 'channel_confirm': None, 'channel_pagamento': None}

MAX_JOGADORES = 2

async def create_queue_embed(channel, tipo, valor):
    key = (tipo.lower(), valor)
    if key not in queues:
        queues[key] = {'members': [], 'msg': None, 'channel_confirm': None, 'channel_pagamento': None}

    data = queues[key]
    queue = data['members']

    titulo = f"{tipo.upper()} | NORTE APOSTAS"
    if "emulador" in tipo.lower():
        titulo += " EMULADOR"

    embed = discord.Embed(
        title=titulo,
        description="Apostas Free Fire",
        color=0xffd700
    )
    embed.add_field(name="Formato", value=tipo, inline=False)
    embed.add_field(name="Valor", value=f"R${valor:.2f}", inline=True)
    embed.add_field(name="Jogadores", value=f"{len(queue)}/{MAX_JOGADORES}\n" + ("\n".join([u.mention for u in queue]) if queue else "Aguardando..."), inline=False)
    
    embed.set_footer(text="Atualizado em")

    view = QueueView(tipo, valor)

    if data['msg'] is None:
        msg = await channel.send(embed=embed, view=view)
        data['msg'] = msg
    else:
        try:
            await data['msg'].edit(embed=embed, view=view)
        except discord.NotFound:
            msg = await channel.send(embed=embed, view=view)
            data['msg'] = msg

class QueueView(discord.ui.View):
    def __init__(self, tipo, valor):
        super().__init__(timeout=None)
        self.tipo = tipo
        self.valor = valor

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        await interaction.response.defer()
        return True

    @discord.ui.button(label="Entrar na fila", style=discord.ButtonStyle.green, emoji="✅")
    async def join(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        try:
            key = (self.tipo.lower(), self.valor)
            if key not in queues:
                queues[key] = {'members': [], 'msg': None, 'channel_confirm': None, 'channel_pagamento': None}

            data = queues[key]
            queue = data['members']

            if interaction.user in queue:
                await interaction.followup.send("Você já está na fila!", ephemeral=True)
                return

            if len(queue) >= MAX_JOGADORES:
                await interaction.followup.send("Fila cheia!", ephemeral=True)
                return

            queue.append(interaction.user)
            await interaction.followup.send("Entrou na fila! Boa sorte mn!", ephemeral=True)

            if len(queue) == 1 and data['channel_confirm'] is None:
                guild = interaction.guild
                overwrites = {
                    guild.default_role: discord.PermissionOverwrite(view_channel=False),
                }
                for user in queue:
                    overwrites[user] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)

                channel_name = f"aguardando-{self.tipo}-{self.valor:.2f}".replace(" ", "-").lower()
                channel_confirm = await guild.create_text_channel(channel_name, overwrites=overwrites, topic=f"Fila {self.tipo} R${self.valor:.2f}")
                data['channel_confirm'] = channel_confirm

                await channel_confirm.send(f"Bem-vindo à fila {self.tipo.upper()} - R${self.valor:.2f}!\nAguardando segundo jogador.")
                await channel_confirm.send(embed=discord.Embed(title="Confirmação da Partida", description="Clique abaixo para confirmar ou cancelar."), view=ConfirmView(queue, self.tipo, self.valor, key))

            await create_queue_embed(interaction.channel, self.tipo, self.valor)
        except Exception as e:
            print(f"Erro no join: {traceback.format_exc()}")
            await interaction.followup.send("Erro ao entrar na fila. Tente novamente.", ephemeral=True)

    @discord.ui.button(label="Sair da fila", style=discord.ButtonStyle.red, emoji="❌")
    async def leave(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        try:
            key = (self.tipo.lower(), self.valor)
            if key not in queues:
                await interaction.followup.send("Fila não encontrada.", ephemeral=True)
                return
            data = queues[key]
            queue = data['members']
            if interaction.user not in queue:
                await interaction.followup.send("Você não está na fila!", ephemeral=True)
                return
            queue.remove(interaction.user)
            await interaction.followup.send("Saiu da fila.", ephemeral=True)
            await create_queue_embed(interaction.channel, self.tipo, self.valor)

            if data['channel_confirm']:
                await data['channel_confirm'].send(f"{interaction.user.mention} saiu da fila.")
        except Exception as e:
            print(f"Erro no leave: {traceback.format_exc()}")
            await interaction.followup.send("Erro ao sair da fila.", ephemeral=True)

class ConfirmView(discord.ui.View):
    def __init__(self, queue, tipo, valor, key):
        super().__init__(timeout=None)
        self.queue = queue
        self.tipo = tipo
        self.valor = valor
        self.key = key
        self.confirmados = set()

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        await interaction.response.defer()
        return True

    @discord.ui.button(label="Confirmar", style=discord.ButtonStyle.green)
    async def confirm(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        try:
            if interaction.user not in self.queue:
                await interaction.followup.send("Você não está na fila!", ephemeral=True)
                return
            self.confirmados.add(interaction.user.id)
            await interaction.followup.send(f"{interaction.user.mention} confirmou!", ephemeral=False)

            if len(self.confirmados) == len(self.queue) == 2:
                await interaction.channel.send("Todos confirmaram! Partida iniciando...")
                await self.criar_canal_pagamento(interaction.guild, interaction.channel)
        except Exception as e:
            print(f"Erro no confirm: {traceback.format_exc()}")
            await interaction.followup.send("Erro ao confirmar.", ephemeral=True)

    @discord.ui.button(label="Cancelar", style=discord.ButtonStyle.red)
    async def cancel(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.defer()
        try:
            if interaction.user not in self.queue:
                await interaction.followup.send("Você não está na fila!", ephemeral=True)
                return
            await interaction.followup.send("Partida cancelada!", ephemeral=False)
            await self.cancelar_fila(interaction.channel)
        except Exception as e:
            print(f"Erro no cancel: {traceback.format_exc()}")
            await interaction.followup.send("Erro ao cancelar.", ephemeral=True)

    async def criar_canal_pagamento(self, guild, old_channel):
        try:
            data = queues[self.key]
            queue = data['members']
            overwrites = {
                guild.default_role: discord.PermissionOverwrite(view_channel=False),
            }
            for user in queue:
                overwrites[user] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True)
            role_adm = guild.get_role(ADMIN_ROLE_ID)
            if role_adm:
                overwrites[role_adm] = discord.PermissionOverwrite(view_channel=True, send_messages=True, manage_messages=True)

            channel_name = f"pagamento-{self.tipo}-{self.valor:.2f}".replace(" ", "-").lower()
            channel_pag = await guild.create_text_channel(channel_name, overwrites=overwrites, topic=f"Pagamento {self.tipo} R${self.valor:.2f}")
            data['channel_pagamento'] = channel_pag

            embed = discord.Embed(title="Pagamento da Partida", description="Partida confirmada!", color=0x00ff00)
            embed.add_field(name="Formato", value=self.tipo, inline=False)
            embed.add_field(name="Valor Aposta", value=f"R${self.valor:.2f}", inline=True)
            embed.add_field(name="Recebe", value=f"R${self.valor * 2:.2f}", inline=True)
            embed.add_field(name="Jogadores", value="\n".join([u.mention for u in queue]), inline=False)
            embed.add_field(name="Mediador", value="@Administração", inline=False)

            view = PagamentoView(self.key, queue, self.valor)
            await channel_pag.send(embed=embed, view=view)
            await old_channel.send(f"Partida confirmada! Canal de pagamento criado: {channel_pag.mention}")
        except Exception as e:
            print(f"Erro ao criar pagamento: {traceback.format_exc()}")
            await old_channel.send("Erro ao criar canal de pagamento. Contate ADM.", ephemeral=True)

    async def cancelar_fila(self, channel):
        try:
            data = queues.get(self.key)
            if data and data['channel_confirm']:
                await data['channel_confirm'].delete(reason="Partida cancelada")
                data['channel_confirm'] = None
                data['members'] = []
            await channel.send("Fila cancelada e canal excluído.")
        except Exception as e:
            print(f"Erro ao cancelar: {e}")

class PagamentoView(discord.ui.View):
    def __init__(self, key, queue, valor):
        super().__init__(timeout=None)
        self.key = key
        self.queue = queue
        self.valor = valor

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if ADMIN_ROLE_ID not in [role.id for role in interaction.user.roles]:
            await interaction.response.send_message("Apenas @Administração pode usar esses botões!", ephemeral=True)
            return False
        await interaction.response.defer()
        return True

    @discord.ui.button(label="Definir Vencedor", style=discord.ButtonStyle.blurple)
    async def definir_vencedor(self, interaction: discord.Interaction, button: discord.ui.Button):
        view = VencedorView(self.queue, self.key)
        await interaction.followup.send("Escolha o vencedor:", view=view, ephemeral=True)

    @discord.ui.button(label="Alterar Valor", style=discord.ButtonStyle.secondary)
    async def alterar_valor(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.followup.send("Digite o novo valor (ex.: 5.00):", ephemeral=True)
        def check(m):
            return m.author == interaction.user and m.channel == interaction.channel
        try:
            msg = await bot.wait_for('message', check=check, timeout=60)
            novo_valor = float(msg.content.replace(',', '.'))
            self.valor = novo_valor
            await interaction.followup.send(f"Valor alterado para R${novo_valor:.2f}!", ephemeral=False)
        except:
            await interaction.followup.send("Valor inválido ou tempo expirado.", ephemeral=True)

    @discord.ui.button(label="Encerrar Aposta", style=discord.ButtonStyle.danger)
    async def encerrar_aposta(self, interaction: discord.Interaction, button: discord.ui.Button):
        try:
            data = queues.get(self.key)
            if data and data['channel_pagamento']:
                await data['channel_pagamento'].delete(reason="Aposta encerrada pelo ADM")
                data['channel_pagamento'] = None
            await interaction.followup.send("Aposta encerrada e canal deletado!", ephemeral=False)
        except Exception as e:
            print(f"Erro ao encerrar: {e}")
            await interaction.followup.send("Erro ao encerrar. Contate dev.", ephemeral=True)

class VencedorView(discord.ui.View):
    def __init__(self, queue, key):
        super().__init__(timeout=60)
        self.queue = queue
        self.key = key

    @discord.ui.button(label="Jogador 1", style=discord.ButtonStyle.primary)
    async def jogador1(self, interaction: discord.Interaction, button: discord.ui.Button):
        vencedor = self.queue[0]
        await interaction.response.send_message(f"Vencedor definido: {vencedor.mention}!", ephemeral=False)

    @discord.ui.button(label="Jogador 2", style=discord.ButtonStyle.primary)
    async def jogador2(self, interaction: discord.Interaction, button: discord.ui.Button):
        vencedor = self.queue[1]
        await interaction.response.send_message(f"Vencedor definido: {vencedor.mention}!", ephemeral=False)

@bot.command()
@commands.has_permissions(administrator=True)
async def setup_fila(ctx, tipo: str, valor_str: str):
    valor_str = valor_str.replace(',', '.')
    try:
        valor = float(valor_str)
    except ValueError:
        await ctx.send("Valor inválido! Ex.: 2.00 ou 2,00")
        return

    key = (tipo.lower(), valor)
    queues[key] = {'members': [], 'msg': None, 'channel_confirm': None, 'channel_pagamento': None}
    await create_queue_embed(ctx.channel, tipo, valor)
    await ctx.send(f"Fila criada: {tipo.upper()} - R${valor:.2f}! O primeiro que entrar cria o canal.")

@bot.command()
@commands.has_permissions(administrator=True)
async def setup_multi(ctx, tipo: str, *valores: str):
    if not valores:
        await ctx.send("Uso: !setup_multi tipo valor1 valor2 valor3 ...")
        return

    criados = []
    for valor_str in valores:
        valor_str = valor_str.replace(',', '.')
        try:
            valor = float(valor_str)
        except ValueError:
            await ctx.send(f"Valor inválido: {valor_str}. Pulando...")
            continue

        key = (tipo.lower(), valor)
        queues[key] = {'members': [], 'msg': None, 'channel_confirm': None, 'channel_pagamento': None}
        await create_queue_embed(ctx.channel, tipo, valor)
        criados.append(f"R${valor:.2f}")

    if criados:
        await ctx.send(f"Filas criadas para {tipo.upper()}: {', '.join(criados)}! Cada uma tem embed separado.")

if __name__ == "__main__":
    token = os.getenv("DISCORD_TOKEN")
    if token:
        bot.run(token)
    else:
        print("Error: DISCORD_TOKEN environment variable not set.")
