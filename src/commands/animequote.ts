import { randomInt } from "node:crypto";
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

const QUOTES = [
  { quote: "I have no special talent. I am only passionately curious.", character: "Miyamoto Musashi", anime: "Vagabond" },
  { quote: "A lesson without pain is meaningless. That's because no one can gain without sacrificing something.", character: "Edward Elric", anime: "Fullmetal Alchemist: Brotherhood" },
  { quote: "People who are weak are just people who are weak, they don't have to suffer for it.", character: "Saitama", anime: "One Punch Man" },
  { quote: "If you don't take risks, you can't create a future.", character: "Luffy", anime: "One Piece" },
  { quote: "The world isn't perfect. But it's there for us, doing the best it can.", character: "Kazuma Kval", anime: "Noragami" },
  { quote: "The moment you think of giving up, think of the reason why you held on so long.", character: "Natsu", anime: "Fairy Tail" },
  { quote: "It's not the face that makes someone a monster; it's the choices they make with their lives.", character: "Naruto Uzumaki", anime: "Naruto" },
  { quote: "A person grows up when they're able to overcome hardships. Protection is important, but you can't grow without experience.", character: "Jiraiya", anime: "Naruto" },
  { quote: "Whatever you do, enjoy it to the fullest.", character: "Meruem", anime: "Hunter x Hunter" },
  { quote: "Hard work is worthless for those that don't believe in themselves.", character: "Rock Lee", anime: "Naruto" },
  { quote: "To know sorrow is not to fear it. To know fear is not to avoid it.", character: "Mob", anime: "Mob Psycho 100" },
  { quote: "The only thing we're allowed to do is believe that we won't regret the choice we made.", character: "Levi", anime: "Attack on Titan" },
  { quote: "The difference between the novice and the master is that the master has failed more times than the novice has tried.", character: "Koro-sensei", anime: "Assassination Classroom" },
  { quote: "You can't rewrite your own story. That's why it's precious.", character: "Eren Yeager", anime: "Attack on Titan" },
  { quote: "I'm not killing you because I hate you. I'm killing you because you're a monster.", character: "Ken Kaneki", anime: "Tokyo Ghoul" },
  { quote: "The world is cruel. But it's also beautiful.", character: "Mikasa Ackerman", anime: "Attack on Titan" },
  { quote: "In this world, wherever there is light, there are also shadows.", character: "Yami Yugi", anime: "Yu-Gi-Oh!" },
  { quote: "To become a true hero, one must overcome the pain of being human.", character: "All Might", anime: "My Hero Academia" },
  { quote: "Real strength isn't about how strong you are. It's about protecting what's important to you.", character: "Gon Freecss", anime: "Hunter x Hunter" },
  { quote: "Life is not a game of luck. If you want to win, work hard.", character: "Sora", anime: "No Game No Life" },
  { quote: "Don't stop believing. Hold on, keep going. The future is yours if you never give up.", character: "Simon", anime: "Gurren Lagann" },
  { quote: "Fear is not evil. It tells you what your weakness is.", character: "Gildarts Clive", anime: "Fairy Tail" },
  { quote: "It's okay to cry. But you have to move forward.", character: "Koro-sensei", anime: "Assassination Classroom" },
  { quote: "The strongest are those who fight for something beyond themselves.", character: "Erza Scarlet", anime: "Fairy Tail" },
  { quote: "We don't have to know what tomorrow holds. That's why we can live for everything we're worth.", character: "Yui", anime: "Angel Beats!" },
  { quote: "If you can't find a reason to fight, create one.", character: "Guts", anime: "Berserk" },
  { quote: "Being strong doesn't mean you never fall. It means you get back up every time you do.", character: "Izuku Midoriya", anime: "My Hero Academia" },
  { quote: "Sometimes you have to accept that you can't win, and just keep moving forward.", character: "Yato", anime: "Noragami" },
  { quote: "You exist inside a world built by someone else. But your life is yours alone.", character: "Kamina", anime: "Gurren Lagann" },
  { quote: "Even if we forget the faces of our friends, we will never forget the bonds we shared.", character: "Hashirama Senju", anime: "Naruto" },
  { quote: "When you give up, that's when the game ends.", character: "Kageyama Shigeo", anime: "Mob Psycho 100" },
  { quote: "It's not the size of the body that matters, it's the size of the heart.", character: "Ace", anime: "One Piece" },
  { quote: "A world without conflict is a world without growth.", character: "Madara Uchiha", anime: "Naruto" },
  { quote: "To live is to fight. To fight is to live.", character: "Kenpachi Zaraki", anime: "Bleach" },
];

export const data = new SlashCommandBuilder()
  .setName("animequote")
  .setDescription("Get a random anime quote");

export async function execute(interaction: ChatInputCommandInteraction) {
  const entry = QUOTES[randomInt(QUOTES.length)];
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setDescription(`*"${entry.quote}"*`)
    .setFooter({ text: `— ${entry.character}, ${entry.anime}` })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
