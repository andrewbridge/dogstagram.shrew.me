import { css } from "goober";
import HeartIcon from "../components/HeartIcon.mjs";
import { getRelativeTimeString, msToMinSec } from "../utilities/time.mjs";
import RetroButton from "../components/RetroButton.mjs";
import GameCompleteScreen from "../components/GameCompleteScreen.mjs";
import { accountBalance } from "../services/data.mjs";

const styles = css`
    & {
        scroll-behavior: smooth;
        scroll-snap-type: y mandatory;
        overflow-y: scroll;
        height: 100%;
        font-size: 3vh;
        position: relative;
    }

    & .game-stats {
        display: flex;
        justify-content: space-around;
        align-items: center;
        height: 10vh;
        padding: 0 2px;
        background: #373737;
        box-shadow: inset -1vh -1vh 0px 0px #252525;
        position: sticky;
        width: calc(100% - 2em - .4rem);
        margin-left: 1em;
        margin-right: 1em;
        top: 0;
        font-size: 1em;
        font-family: "Press Start 2P", cursive;
        text-decoration: none;
        color: white;
        z-index: 1;

        & .stats {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: start;
        }

        & .finish {
            border-radius: 21em;
            padding: .35em .5em;
            z-index: 5;
        }

        &::before, &::after {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            box-sizing: content-box;
        }

        &::before {
            top: -.75vh;
            left: 0;
            border-top: .75vh #c7c7c7 solid;
            border-bottom: .75vh #c7c7c7 solid;
        }

        &::after {
            left: -.75vh;
            top: 0;
            border-left: .75vh #c7c7c7 solid;
            border-right: .75vh #c7c7c7 solid;
        }
    }

    & .text-block {
        padding-left: 1vh;
        padding-right: 1vh;
    }

    & .post {
        height: calc(100% - 10vh);
        padding-top: 10vh;
        background white;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        /* justify-content: center; */
        position: relative;
        overflow: hidden;
    }

    & .post header {
        height: 10vh;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 2vh;
    }

    & .post header img {
        width: 6.25vh;
        height: 6.25vh;
        border-radius: 50%;
        border: .3vh solid #d4d4d4;
    }

    & .post img {
        flex-grow: 0;
        width: 100%;
        height: 52.7vh;
        aspect-ratio: 7 / 8;
        object-fit: cover;
    }

    & .post .tools {
        margin: 4px 0;
        height: 6vh;

        & button {
            height: 100%;
        }
    }

    & .post .tools button {
        background: none;
        border: none;
        cursor: pointer;
    }

    & .post header .user-info {
        
    }

    & .post header .user-info p:first-child {
        font-weight: bold;
    }

    & .post .date {
        font-size: 0.75em;
        color: #707070;
    }
`;

const completionScreen = css`
    & .stats {
        font-size: 2.6vh;
        display: flex;
        align-items: center;
        flex-direction: column;
        gap: 2vh;
        text-align: center;
    }
`;

export default {
    name: "Feed",
    components: { RetroButton, HeartIcon, GameCompleteScreen },
    inject: ["router"],
    data: () => ({
        posts: [],
        shownPostCount: 10,
        likes: new Set(),
        startTime: Date.now(),
        timeNow: Date.now(),
        timerUid: null,
        feedBodyEventListener: null,
        showGameCompleteScreen: false,
        coinsEarned: 0,
    }),
    computed: {
        elapsedTimeMs() {
            return this.timeNow - this.startTime;
        },
        elapsedTimeText() {
            return msToMinSec(this.elapsedTimeMs);
        },
        shownPosts() {
            return this.posts.slice(0, this.shownPostCount);
        }
    },
    created() {
        // Create fake dog themed posts
        // A list of different dog names
        const names = ['Doggo', 'Pupper', 'Pooch', 'Pup', 'Pupperino', 'Pupperoni', 'Pupperina', 'Pupperina'];
        // A list of different dog locations
        const locations = ['Poochville', 'Dogtown', 'Barksville', 'Pupperland', 'Poochland', 'Dogsville', 'Pupland', 'Dogtopia'];
        // A list of different dog captions
        const captions = [
            "Snoozin' on da couch. Hard being dis cute. Nap time is da best time! 😴",
            "Iz playin' fetch wit my hooman! Ball is life! 🎾",
            "Got da zoomies! Runnin' around da yard is my fave! 🤪",
            "Belly rubz plz! I'z been a very good boi. 🥰",
            "Dis my spot. No touchy! 🦮",
            "Dinner time! Nom nom nom! Foodz are da best! 🍖",
            "Just chillin' in da sunbeam. Warmz my bones. ☀️",
            "Went for a walkie! Saw so many squirrels! 🐿️",
            "I love my hooman! We'z best frenz! ❤️",
            "Dreamin' of treatz! 💭",
            "Bark bark! Hello frenz! 👋",
            "Chewin' on my fave toy. Don't even think about takin' it. 😠",
            "Car ridez are da best! Where we goin'? 🚗",
            "Post-walkie nap. So tired! 😴",
            "Dis my kingdom. I rule dis house! 👑",
            "Iz a vvv good boi! Treats plz! 🦴",
            "Iz a pupper! 🐶",
            "Iz a doggo! 🐕",
            "Iz a woofer! 🐩",
            "Iz a floofer! 🦮",
            "Iz a boopable snoot! 👃",
            "Woke up like dis. #Flawless #DogLife ✨",
            "Guarding da house from squirrels and postmen. It's hard work! 🛡️",
            "Snuggles wit my teddy. He's my bestest buddy. 🧸",
            "Iz helping hooman work. Supervising is a tough job. 💻",
            "Found a comfy spot under da table. Don't tell hooman! 🤫",
            "Treato time! Gimme gimme! 🐾",
            "Rollin' in da grass. Smells so good! 🌿",
            "Waiting patiently for my walkie. Any minute now... 👀",
            "Big yawn! Time for a snooze. 🥱",
            "Head scratches are my weakness. I melt every time. 🫠",
            "Went to da park! Made lots of new frenz! 🐕‍🦺",
            "My face when hooman says 'walkies'! 🤩",
            "Dreaming of chasing squirrels. One day I'll catch one! 🐿️",
            "Is it dinner time yet? I'm starving! 🍗",
            "Just being a good boi/gurl. Deserve all da treatz!😇",
        ];
        // We'll use placedog.net for the post images themselves, you can use this URL with ?id=x to get a specific image, there are 248 images available, starting at 1
        // We'll use picsum.photos for the profile photos, you can use this URL with ?random to get a random image from a seed
        let postDate = Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7);
        const randomDogUrls = [];
        for (let i = 1; i < 248; i++) {
            randomDogUrls.push(`https://placedog.net/640?id=${i}`);
        }
        const dachshundDogUrls = [];
        for (let i = 1; i < 24; i++) {
            dachshundDogUrls.push(`./assets/feed-photos/item-${i}.jpg`);
        }
        while (randomDogUrls.length > 0 && dachshundDogUrls.length > 0) {
            const imageSet = this.posts.length % 3 === 0 && dachshundDogUrls.length > 0 ? dachshundDogUrls : randomDogUrls;
            const imageId = Math.floor(Math.random() * imageSet.length);
            const imageUrl = imageSet.splice(imageId, 1)[0];
            this.posts.push({
                name: names[Math.floor(Math.random() * names.length)],
                location: locations[Math.floor(Math.random() * locations.length)],
                caption: captions[Math.floor(Math.random() * captions.length)],
                date: getRelativeTimeString(postDate),
                profileImageUrl: `https://picsum.photos/800?random=${imageId}`,
                imageUrl,
            });
            postDate -= Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7);
        }
    },
    mounted() {
        this.timerUid = setInterval(() => {
            this.timeNow = Date.now();
        }, 1000);
        // When the user scrolls, check if we need to load more posts
        const feedBody = this.$refs.feedBody;
        this.feedBodyEventListener = feedBody.addEventListener("scroll", () => {
            const scrollPosition = feedBody.scrollTop + feedBody.clientHeight;
            const penultimatePostPosition = (feedBody.scrollHeight / this.shownPostCount) * (this.shownPostCount - 1)
            if (scrollPosition >= penultimatePostPosition) {
                this.shownPostCount += 10;
                if (this.shownPostCount > this.posts.length) {
                    feedBody.removeEventListener("scroll", this.feedBodyEventListener);
                }
            }
        });
    },
    beforeUnmount() {
        this.$refs.feedBody.removeEventListener("scroll", this.feedBodyEventListener);
    },
    unmounted() {
        clearInterval(this.timerUid);
    },
    methods: {
        likePost(postIndex) {
            this.likes.add(postIndex);
        },
        finishGame() {
            this.showGameCompleteScreen = true;
            clearInterval(this.timerUid);
            // We want to convert the time elapsed and likes to a monetary value, for every 20 seconds we'll add 3, for every like we'll add 1
            const oldBalance = accountBalance.value;
            accountBalance.value += Math.floor(this.elapsedTimeMs / 20000) * 6 + (this.likes.size * 2);
            this.coinsEarned = accountBalance.value - oldBalance;
        }
    },
    template: /* html */`
        <div ref="feedBody" class="${styles}">
            <div class="game-stats">
                <div class="stats">
                    <p>{{likes.size}} likes</p>
                    <p>{{ elapsedTimeText }}</p>
                </div>
                <RetroButton class="finish" @click="finishGame">✔</RetroButton>
            </div>
            <section class="post" v-for="(post, index) in shownPosts" :key="index">
                <header class="text-block">
                    <img :src="post.profileImageUrl" width="25" height="25" loading="lazy" />
                    <div class="user-info">
                        <p>{{ post.name }}</p>
                        <p>{{ post.location }}</p>
                    </div>
                </header>
                <img :src="post.imageUrl" alt="Placeholder" loading="lazy" />
                <div class="text-block tools">
                    <button @click="likePost(index)"><HeartIcon :fill="likes.has(index) ? 'currentColor' : 'none'" /></button>
                </div>
                <div class="text-block caption">
                    <p><strong>{{ post.name }}</strong> {{ post.caption }}</p>
                </div>
                <div class="text-block date">
                    <p>{{ post.date }}</p>
                </div>
            </section>
        </div>
        <GameCompleteScreen class="${completionScreen}" :show="showGameCompleteScreen">
            <h1>Doggo-scrolling done!</h1>
            <div class="stats">
                <p>Likes: {{ likes.size }}</p>
                <p>Time: {{ elapsedTimeText }}</p>
                <p>You earned {{ coinsEarned }} coins!</p>
            </div>
            <RetroButton variant="info" @click="router.goTo('Home')">Back to pup</RetroButton>
        </GameCompleteScreen>
    `,
}