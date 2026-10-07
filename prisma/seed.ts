import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const VIDEO_BASE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/'
const THUMB_BASE = 'https://picsum.photos/seed/'
const AVATAR_BASE = 'https://api.dicebear.com/7.x/personas/svg?seed='

const sampleVideos = [
  'BigBuckBunny',
  'ElephantsDream',
  'ForBiggerBlazes',
  'ForBiggerEscapes',
  'ForBiggerFun',
  'ForBiggerJoyrides',
  'ForBiggerMeltdowns',
  'Sintel',
  'SubaruOutbackOnStreetAndDirt',
  'TearsOfSteel',
  'VolkswagenGTIReview',
  'WeAreGoingOnBullrun',
  'WhatCarCanYouGetForAGrand',
]

function videoUrl(name: string) {
  return `${VIDEO_BASE}${name}.mp4`
}
function thumb(seed: string) {
  return `${THUMB_BASE}${encodeURIComponent(seed)}/640/360`
}
function banner(handle: string) {
  return `${THUMB_BASE}${encodeURIComponent(handle + '-banner')}/1920/350`
}
function avatar(handle: string) {
  return `${AVATAR_BASE}${encodeURIComponent(handle)}`
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(d.getHours() - Math.floor(n * 0.4))
  return d
}

const channels = [
  {
    name: 'Pixel Frames',
    handle: 'pixelframes',
    description: 'We dive deep into the world of gaming — from retro classics to next-gen masterpieces. New uploads every Tuesday and Friday.',
    subscribers: 1284000,
    verified: true,
  },
  {
    name: 'Tech Unboxed',
    handle: 'techunboxed',
    description: 'Honest, in-depth reviews of the latest gadgets, laptops, and smartphones. We test everything so you do not have to.',
    subscribers: 856000,
    verified: true,
  },
  {
    name: 'Wander Lens',
    handle: 'wanderlens',
    description: 'Travel films from every corner of the planet. Join us as we chase light, culture, and untold stories.',
    subscribers: 432000,
    verified: false,
  },
  {
    name: 'Gear Garage',
    handle: 'geargarage',
    description: 'Car reviews, road trips, and everything with four wheels and an engine. Petrolhead paradise.',
    subscribers: 1903000,
    verified: true,
  },
  {
    name: 'Indie Waves',
    handle: 'indiewaves',
    description: 'Independent music, live sessions, and artist interviews. Press play and discover your next favourite track.',
    subscribers: 678000,
    verified: true,
  },
  {
    name: 'Tasty Lab',
    handle: 'tastylab',
    description: 'Approachable recipes, kitchen science, and the occasional 24-hour experiment. Cook along with us!',
    subscribers: 2310000,
    verified: true,
  },
  {
    name: 'Mind Forge',
    handle: 'mindforge',
    description: 'Animated explainers on science, history, and the ideas that shape our world. Learn something new every week.',
    subscribers: 1540000,
    verified: true,
  },
  {
    name: 'Laugh Loop',
    handle: 'laughloop',
    description: 'Sketch comedy, parodies, and the internet\'s freshest memes. Subscribe before the loop gets you.',
    subscribers: 987000,
    verified: false,
  },
]

type VideoSeed = {
  channelHandle: string
  title: string
  description: string
  category: string
  tags: string
  sample: string
  duration: string
  views: number
  likes: number
  dislikes: number
  daysAgo: number
  thumbSeed: string
}

const videos: VideoSeed[] = [
  // Pixel Frames — Gaming
  {
    channelHandle: 'pixelframes', sample: 'ForBiggerFun', category: 'Gaming',
    title: 'I Survived 100 Days in Hardcore Minecraft (Full Movie)',
    description: 'After 100 days of mining, building, and barely escaping death, here is the entire journey compiled into one epic montage. Grab some popcorn!',
    tags: 'minecraft,gaming,hardcore,100 days',
    duration: '18:42', views: 4280000, likes: 312000, dislikes: 4200, daysAgo: 3,
    thumbSeed: 'minecraft-hardcore-100',
  },
  {
    channelHandle: 'pixelframes', sample: 'BigBuckBunny', category: 'Gaming',
    title: 'Ranking EVERY Boss in Elden Ring From Easiest to Hardest',
    description: 'From the lowly Tree Sentinel to the dreaded Malenia, we rank all 16 main bosses. Spoilers ahead!',
    tags: 'elden ring,fromsoftware,boss ranking',
    duration: '24:11', views: 1890000, likes: 145000, dislikes: 2100, daysAgo: 14,
    thumbSeed: 'elden-ring-boss-rank',
  },
  {
    channelHandle: 'pixelframes', sample: 'ForBiggerJoyrides', category: 'Gaming',
    title: 'The Most Underrated RPG of 2024 — You Need to Play This',
    description: 'Nobody is talking about this gem, and that is a crime. Here is why it deserves your attention.',
    tags: 'rpg,underrated,review,2024',
    duration: '15:30', views: 642000, likes: 51000, dislikes: 800, daysAgo: 28,
    thumbSeed: 'underrated-rpg-2024',
  },
  {
    channelHandle: 'pixelframes', sample: 'Sintel', category: 'Gaming',
    title: 'We Built a Working Computer in Terraria (No Mods)',
    description: 'It took 200 hours but we did it. A fully functional calculator inside Terraria using only logic gates and wires.',
    tags: 'terraria,redstone,logic,build',
    duration: '12:05', views: 921000, likes: 78000, dislikes: 600, daysAgo: 51,
    thumbSeed: 'terraria-computer-build',
  },

  // Tech Unboxed — Tech
  {
    channelHandle: 'techunboxed', sample: 'VolkswagenGTIReview', category: 'Tech',
    title: 'I Used the $1999 Laptop for 30 Days — Honest Review',
    description: 'Is the new flagship worth your money? After a month of daily use, here is the truth no one else is telling you.',
    tags: 'laptop,review,tech,2024',
    duration: '14:22', views: 732000, likes: 64000, dislikes: 1100, daysAgo: 2,
    thumbSeed: 'laptop-review-1999',
  },
  {
    channelHandle: 'techunboxed', sample: 'ForBiggerEscapes', category: 'Tech',
    title: 'The Cheapest Phone Worth Buying in 2024',
    description: 'Flagships get all the hype, but budget phones have gotten shockingly good. We tested 12 to find the best one under $300.',
    tags: 'budget phone,smartphone,review',
    duration: '19:48', views: 1240000, likes: 92000, dislikes: 1500, daysAgo: 9,
    thumbSeed: 'cheap-phone-2024',
  },
  {
    channelHandle: 'techunboxed', sample: 'ForBiggerMeltdowns', category: 'Tech',
    title: 'Setting Up My Dream Desk Setup (4 Monitors!)',
    description: 'A tour of my ultimate productivity battlestation, including the cable management nightmare behind it.',
    tags: 'desk setup,productivity,tech tour',
    duration: '11:37', views: 528000, likes: 41000, dislikes: 700, daysAgo: 21,
    thumbSeed: 'dream-desk-setup',
  },

  // Wander Lens — Travel
  {
    channelHandle: 'wanderlens', sample: 'SubaruOutbackOnStreetAndDirt', category: 'Travel',
    title: 'Driving Across Iceland in 7 Days — A Cinematic Road Trip',
    description: 'Black sand beaches, glacier lagoons, and the loneliest roads in Europe. This is Iceland like you have never seen.',
    tags: 'iceland,road trip,travel film,cinematic',
    duration: '22:14', views: 892000, likes: 73000, dislikes: 400, daysAgo: 5,
    thumbSeed: 'iceland-road-trip',
  },
  {
    channelHandle: 'wanderlens', sample: 'ForBiggerBlazes', category: 'Travel',
    title: '48 Hours in Kyoto: Temples, Tea, and Hidden Alleys',
    description: 'A whirlwind weekend in Japan\'s cultural heart. The best food stalls, the quietest shrines, and where to watch the sunset.',
    tags: 'kyoto,japan,travel guide,48 hours',
    duration: '16:50', views: 412000, likes: 38000, dislikes: 200, daysAgo: 17,
    thumbSeed: 'kyoto-48-hours',
  },
  {
    channelHandle: 'wanderlens', sample: 'ElephantsDream', category: 'Travel',
    title: 'Living in a Van for a Year — What I Wish I Knew',
    description: 'Twelve months, thirty countries, and a lot of cold meals. The honest pros and cons of full-time van life.',
    tags: 'van life,minimalism,travel,lifestyle',
    duration: '28:03', views: 1040000, likes: 88000, dislikes: 900, daysAgo: 44,
    thumbSeed: 'van-life-year',
  },

  // Gear Garage — Cars
  {
    channelHandle: 'geargarage', sample: 'WhatCarCanYouGetForAGrand', category: 'Cars',
    title: 'I Bought a $1000 Car and Drove it 1000 Miles',
    description: 'The challenge: buy the cheapest running car we could find and take it on a cross-country road trip. Did it survive?',
    tags: 'cheap car,road trip,challenge,cars',
    duration: '31:25', views: 2890000, likes: 214000, dislikes: 3200, daysAgo: 4,
    thumbSeed: 'thousand-dollar-car',
  },
  {
    channelHandle: 'geargarage', sample: 'WeAreGoingOnBullrun', category: 'Cars',
    title: 'The Ultimate $50,000 Sports Car Showdown',
    description: 'Five contenders, one budget. We drag race, canyon carve, and daily drive them to find the best enthusiast car under 50k.',
    tags: 'sports car,comparison,drag race',
    duration: '26:18', views: 1670000, likes: 128000, dislikes: 1800, daysAgo: 12,
    thumbSeed: '50k-sports-car-showdown',
  },
  {
    channelHandle: 'geargarage', sample: 'SubaruOutbackOnStreetAndDirt', category: 'Cars',
    title: 'Restoring a Forgotten Classic: 6 Months in 20 Minutes',
    description: 'We rescued a barn-find and brought it back to life. Watch the full transformation from rust bucket to show stopper.',
    tags: 'restoration,classic car,project car',
    duration: '20:47', views: 743000, likes: 61000, dislikes: 500, daysAgo: 33,
    thumbSeed: 'classic-car-restoration',
  },

  // Indie Waves — Music
  {
    channelHandle: 'indiewaves', sample: 'Sintel', category: 'Music',
    title: 'Live Bedroom Session: Acoustic Covers Vol. 4',
    description: 'An intimate set of reimagined favourites, recorded in one take in my tiny apartment. Headphones recommended.',
    tags: 'acoustic,live session,covers,music',
    duration: '34:12', views: 384000, likes: 41000, dislikes: 150, daysAgo: 6,
    thumbSeed: 'acoustic-bedroom-session',
  },
  {
    channelHandle: 'indiewaves', sample: 'ForBiggerFun', category: 'Music',
    title: 'Producing a Song From Scratch in 1 Hour (Time-lapse)',
    description: 'Watch a full track come together from an empty project to a finished master, with every decision explained.',
    tags: 'music production,beat making,tutorial',
    duration: '17:29', views: 219000, likes: 24000, dislikes: 120, daysAgo: 19,
    thumbSeed: 'producing-song-timelapse',
  },

  // Tasty Lab — Cooking
  {
    channelHandle: 'tastylab', sample: 'ForBiggerBlazes', category: 'Cooking',
    title: 'Perfect Pizza Dough Recipe (No Stand Mixer Needed)',
    description: 'The foolproof method for Neapolitan-style pizza at home, using just your hands and a hot oven. Sauce and toppings included.',
    tags: 'pizza,dough,recipe,cooking',
    duration: '13:58', views: 1620000, likes: 134000, dislikes: 900, daysAgo: 1,
    thumbSeed: 'perfect-pizza-dough',
  },
  {
    channelHandle: 'tastylab', sample: 'ForBiggerMeltdowns', category: 'Cooking',
    title: '24-Hour Slow Cooked Ramen — Worth the Wait?',
    description: 'We simmered tonkotsu broth for a full day to see if patience really makes better ramen. Spoiler: yes.',
    tags: 'ramen,slow cooking,japanese food',
    duration: '21:33', views: 987000, likes: 82000, dislikes: 700, daysAgo: 10,
    thumbSeed: 'slow-cooked-ramen',
  },
  {
    channelHandle: 'tastylab', sample: 'ElephantsDream', category: 'Cooking',
    title: '5 Dinners Under $5 — Budget Meal Prep',
    description: 'Eat well on a tight budget. Five satisfying dinners that each cost less than a fancy coffee.',
    tags: 'budget meals,meal prep,cheap eats',
    duration: '15:02', views: 1240000, likes: 96000, dislikes: 1100, daysAgo: 25,
    thumbSeed: 'budget-meal-prep',
  },

  // Mind Forge — Education
  {
    channelHandle: 'mindforge', sample: 'BigBuckBunny', category: 'Education',
    title: 'How Does the Internet Actually Work? (Animated)',
    description: 'From your keyboard to a server across the world in milliseconds. A visual journey through the packets, cables, and protocols.',
    tags: 'internet,how it works,animation,education',
    duration: '12:48', views: 2310000, likes: 198000, dislikes: 1200, daysAgo: 7,
    thumbSeed: 'how-internet-works',
  },
  {
    channelHandle: 'mindforge', sample: 'TearsOfSteel', category: 'Education',
    title: 'The Science of Black Holes Explained Simply',
    description: 'Spaghettification, event horizons, and why time itself bends. The strangest objects in the universe, made simple.',
    tags: 'black holes,physics,space,science',
    duration: '18:15', views: 1850000, likes: 161000, dislikes: 900, daysAgo: 16,
    thumbSeed: 'black-holes-science',
  },
  {
    channelHandle: 'mindforge', sample: 'ForBiggerEscapes', category: 'Education',
    title: 'Why Ancient Rome REALLY Fell (It Is Not What You Think)',
    description: 'Forget the barbarians — the real reasons behind the fall of Rome are stranger and more relevant than the textbooks admit.',
    tags: 'rome,history,ancient rome',
    duration: '23:40', views: 2740000, likes: 221000, dislikes: 2400, daysAgo: 30,
    thumbSeed: 'fall-of-rome',
  },

  // Laugh Loop — Comedy
  {
    channelHandle: 'laughloop', sample: 'ForBiggerFun', category: 'Comedy',
    title: 'If Every Job Was Paid Like an Intern (Sketch)',
    description: 'What if surgeons, pilots, and CEOs all got the intern treatment? A completely serious documentary. (It is not.)',
    tags: 'comedy,sketch,parody',
    duration: '8:24', views: 1430000, likes: 128000, dislikes: 1300, daysAgo: 3,
    thumbSeed: 'intern-job-sketch',
  },
  {
    channelHandle: 'laughloop', sample: 'Sintel', category: 'Comedy',
    title: 'Reacting to the Worst Movie Endings Ever',
    description: 'We sat through the most baffling finale scenes so you do not have to. Bring your suspension of disbelief.',
    tags: 'reaction,comedy,movies,bad endings',
    duration: '19:11', views: 678000, likes: 54000, dislikes: 800, daysAgo: 20,
    thumbSeed: 'worst-movie-endings',
  },
  {
    channelHandle: 'laughloop', sample: 'ForBiggerJoyrides', category: 'Comedy',
    title: 'I Tried Every Viral Trend So You Do not Have To',
    description: 'From the ice bath challenge to the latest dance craze, I suffered through them all so you can watch from a safe distance.',
    tags: 'challenge,viral,comedy',
    duration: '14:55', views: 1090000, likes: 92000, dislikes: 1700, daysAgo: 38,
    thumbSeed: 'viral-trends-challenge',
  },
]

const comments = [
  'This is exactly the content I subscribed for. Absolute gold.',
  'The editing on this one is next level. How long did this take to make?',
  'Came for the thumbnail, stayed for the whole video. Well done!',
  'I have watched this three times already and it keeps getting better.',
  'Underrated channel alert. More people need to see this.',
  'The way you explain things makes it so easy to understand. Thank you!',
  'Okay but can we talk about that plot twist at 7:42? Mind blown.',
  'Algorithm finally did me a favour and recommended this. Cheers!',
  'I needed this today. Keep doing what you are doing.',
  'Production value just keeps climbing. Proud of you guys.',
  'Not me watching the entire thing instead of studying for finals.',
  'This deserves way more views. Sharing with everyone I know.',
]

const commentAuthors = [
  'Alex Rivera', 'Morgan Chen', 'Priya Kapoor', 'Jordan Lee', 'Sam Whitfield',
  'Nina Petrov', 'Devon Brooks', 'Maya Singh', 'Theo Nakamura', 'Riley Foster',
  'Aisha Bello', 'Caleb Stone', 'Ingrid Olsen', 'Marcus Vale', 'Sofia Marín',
]

async function main() {
  console.log('Seeding database...')

  // Wipe
  await db.comment.deleteMany()
  await db.video.deleteMany()
  await db.channel.deleteMany()

  const channelMap = new Map<string, string>()

  for (const c of channels) {
    const created = await db.channel.create({
      data: {
        name: c.name,
        handle: c.handle,
        avatar: avatar(c.handle),
        banner: banner(c.handle),
        description: c.description,
        subscribers: c.subscribers,
        verified: c.verified,
      },
    })
    channelMap.set(c.handle, created.id)
    console.log(`  channel: ${c.name} (${c.handle})`)
  }

  for (const v of videos) {
    const channelId = channelMap.get(v.channelHandle)!
    const created = await db.video.create({
      data: {
        channelId,
        title: v.title,
        description: v.description,
        thumbnail: thumb(v.thumbSeed),
        videoUrl: videoUrl(v.sample),
        duration: v.duration,
        views: v.views,
        likes: v.likes,
        dislikes: v.dislikes,
        category: v.category,
        tags: v.tags,
        publishedAt: daysAgo(v.daysAgo),
      },
    })

    // Add a handful of comments per video
    const commentCount = 3 + Math.floor(Math.random() * 4)
    for (let i = 0; i < commentCount; i++) {
      const author = commentAuthors[(i + v.daysAgo) % commentAuthors.length]
      const text = comments[(i * 3 + v.daysAgo) % comments.length]
      await db.comment.create({
        data: {
          videoId: created.id,
          authorName: author,
          authorAvatar: avatar(author.replace(/\s+/g, '').toLowerCase()),
          text,
          likes: Math.floor(Math.random() * 4200),
          createdAt: daysAgo(Math.max(0, v.daysAgo - Math.floor(Math.random() * v.daysAgo + 1))),
        },
      })
    }
    console.log(`  video: ${v.title}`)
  }

  const counts = {
    channels: await db.channel.count(),
    videos: await db.video.count(),
    comments: await db.comment.count(),
  }
  console.log('Seed complete:', counts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
