import asyncio
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
import os

# Получаем токен из переменных окружения (которые мы прокинем через GitHub Actions)
TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = 6176762600

bot = Bot(token=TOKEN)
dp = Dispatcher()

# Хранилище для связи ID сообщения админа с ID сообщения в группе
# Формат: {message_id_in_admin_chat: (chat_id, message_id_in_group)}
msg_map = {}

@dp.message(F.chat.type.in_({'group', 'supergroup'}))
async def handle_group_messages(message: types.Message):
    user = message.from_user
    username = f"@{user.username}" if user.username else user.full_name
    
    text = (
        f"({message.chat.title})\n"
        f"Пользователь: {username}\n"
        f"{message.text or '[Медиа/Стикер]'}"
    )
    
    # Отправляем админу
    sent = await bot.send_message(chat_id=ADMIN_ID, text=text)
    
    # Сохраняем привязку для ответа
    msg_map[sent.message_id] = (message.chat.id, message.message_id)

@dp.message(F.chat.id == ADMIN_ID, F.reply_to_message)
async def admin_reply(message: types.Message):
    reply_id = message.reply_to_message.message_id
    
    if reply_id in msg_map:
        chat_id, target_msg_id = msg_map[reply_id]
        await bot.send_message(
            chat_id=chat_id,
            text=message.text,
            reply_to_message_id=target_msg_id
        )

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
  
