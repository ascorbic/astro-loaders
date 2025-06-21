import { defineLiveCollection } from 'astro:content';
import { liveFeedLoader } from '@ascorbic/feed-loader';

const news = defineLiveCollection({
  type: 'live',
  loader: liveFeedLoader({
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  }),
});

export const collections = { news };