const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const ADMIN_ID = 6176762600;

// Слушаем сообщения в группах
bot.on('message', async (msg) => {
    // Если сообщение от админа - пропускаем, чтобы не зациклить
    if (msg.chat.id === ADMIN_ID) return;

    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
        const text = `(${msg.chat.title})\nПользователь: ${username}\n${msg.text || '[Медиа/Стикер]'}`;

        const sent = await bot.sendMessage(ADMIN_ID, text);
        
        // Пишем в БД: admin_msg_id (ключ) -> группа и original_msg_id
        await supabase.from('message_mapping').insert([
            { 
                admin_msg_id: sent.message_id, 
                group_chat_id: msg.chat.id, 
                group_msg_id: msg.message_id 
            }
        ]);
    }
});

// Слушаем реплаи админа в личке
bot.on('message', async (msg) => {
    if (msg.chat.id === ADMIN_ID && msg.reply_to_message) {
        const { data, error } = await supabase
            .from('message_mapping')
            .select('group_chat_id, group_msg_id')
            .eq('admin_msg_id', msg.reply_to_message.message_id)
            .single();

        if (data) {
            await bot.sendMessage(data.group_chat_id, msg.text, {
                reply_to_message_id: data.group_msg_id
            });
        }
    }
});

console.log("Бот успешно запущен и слушает БД...");
