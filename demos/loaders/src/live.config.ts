import { defineLiveCollection } from 'astro:content';
import { liveFeedLoader } from '@ascorbic/feed-loader';

const liveNews = defineLiveCollection({
  type: 'live',
  loader: liveFeedLoader({
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    defaultFilters: {
      limit: 20,
    },
  }),
});

export const collections = { liveNews };