export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  date: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "we-dont-start-with-software",
    title: "We don't start with software",
    excerpt:
      "Why every engagement at Cafton begins with a conversation about the problem, not a list of features.",
    date: "2026-08-20",
    content: [
      "Most software gets built backwards. Someone decides a mobile app is the answer before anyone has written down what question it's supposed to answer. A dashboard gets specced because dashboards are what software companies build, not because anyone checked whether a dashboard is what the situation actually needs.",
      "We've built systems for disaster response teams, restaurant floors, and organizations that had never worked with a software company before. The pattern that holds across all of it: the first meeting is never about frameworks or timelines. It's about what's actually going wrong, for whom, and how they're coping with it right now, today, without any of our help.",
      "Sometimes that conversation ends with a mobile app. Sometimes it ends with a much smaller piece of software than anyone expected, because the real bottleneck turned out to be a single manual step buried in an existing process. Either way, we'd rather find that out in week one than discover it after three months of building the wrong thing well.",
      "This isn't a slogan we picked because it sounded good on a homepage, although it does. It's closer to a discipline: hold off on solutions long enough to actually understand the problem, even when the client already has an idea of what they want built. Sometimes that idea is right. Often it needs a conversation first.",
      "If you're reading this because you're trying to decide whether to bring us a fully-specced feature list or an open problem, bring the problem. We'll help you figure out the rest.",
    ],
  },
  {
    slug: "building-iligtas",
    title: "What we learned building iLigtas",
    excerpt:
      "Notes from building a disaster-preparedness platform where the cost of a bug isn't a support ticket, it's someone not getting an alert in time.",
    date: "2026-08-05",
    content: [
      "iLigtas started as a straightforward-sounding request: help coordinate emergency response and preparedness information across a region prone to earthquakes and landslides. It didn't stay straightforward for long, and that turned out to be the useful part.",
      "The first real design decision wasn't technical. It was about who the system actually serves. A geofenced alert is only useful if it reaches someone who can act on it in the next few minutes, on a phone that might have weak signal, in a moment when they're not thinking about how to use an app. That constraint shaped almost everything downstream: how aggressively we cached data locally, how little we asked of the user interface during an active alert, and how much we tested on low-end devices rather than whatever hardware was sitting on our own desks.",
      "Geofencing sounds simple until you're deciding what happens when a hazard zone boundary needs to update while people are already inside it, or when location data is stale because someone's phone went into battery-saver mode at exactly the wrong time. We spent more time on these edge cases than on the features that ended up in the demo, because the demo isn't what has to hold up during an actual earthquake.",
      "On the administration side, the platform needed to be usable by people coordinating a response in real time, not just by whoever built it. That meant treating the admin dashboard as a first-class product, not an afterthought bolted onto the consumer-facing app. Response coordinators needed to draw and adjust hazard zones, push alerts, and see who's inside an affected area, all without a training session first.",
      "The recognition the project has received (Regional Finalist at the Philippine Startup Challenge, Finalist at the Baguio Smart City Challenge) is a nice signal, but the more useful measure has been watching real coordination teams use it and tell us what still doesn't work. That feedback loop, more than any single technical decision, is what's actually shaped the platform into something worth deploying.",
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Reading time derived from the post's own words, at 200 wpm.
 *
 * Previously this was a hand-written string on each post and both were
 * roughly three times the real figure, which is exactly the kind of
 * invented-precision number the design skills flag.
 */
export function readingTime(post: BlogPost): string {
  const words = post.content.join(" ").trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}
