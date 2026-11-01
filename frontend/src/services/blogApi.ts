import { cleanParams, http } from './http';
import type { PageResponse } from '../types/api';

export type BlogCategory = 'ADMISSIONS' | 'BOARD_COMPARISON' | 'FEES_SCHOLARSHIPS' | 'PARENTING_TIPS' | 'SCHOOL_REVIEWS';

export const BLOG_CATEGORIES: [BlogCategory, string][] = [
  ['ADMISSIONS', 'Admissions'],
  ['BOARD_COMPARISON', 'Board Comparison'],
  ['FEES_SCHOLARSHIPS', 'Fees & Scholarships'],
  ['PARENTING_TIPS', 'Parenting Tips'],
  ['SCHOOL_REVIEWS', 'School Reviews'],
];

export const blogCategoryLabel = (c: BlogCategory) => BLOG_CATEGORIES.find(([code]) => code === c)?.[1] ?? c;

export interface BlogCard {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorName: string;
  publishedAt: string;
  minutesToRead: number;
}

export interface BlogArticle {
  card: BlogCard;
  body: string;
  authorBio: string | null;
  updatedAt: string;
  related: BlogCard[];
}

export interface BlogPostInput {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: BlogCategory;
  coverImageUrl: string;
  coverImageAlt: string;
  authorName: string;
  authorBio: string;
  metaTitle: string;
  metaDescription: string;
  published: boolean;
}

export interface AdminBlogPost extends Omit<BlogPostInput, 'coverImageUrl' | 'coverImageAlt' | 'authorBio' | 'metaTitle' | 'metaDescription'> {
  id: number;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  authorBio: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export const blogService = {
  list: (params: { q?: string; category?: string; page?: number; size?: number }) =>
    http.get<PageResponse<BlogCard>>('/blog/posts', { params: cleanParams(params) }).then((r) => r.data),
  article: (slug: string) => http.get<BlogArticle>(`/blog/posts/${encodeURIComponent(slug)}`).then((r) => r.data),
};

export const adminBlogService = {
  list: (page = 0) => http.get<PageResponse<AdminBlogPost>>('/admin/blog/posts', { params: { page } }).then((r) => r.data),
  create: (body: BlogPostInput) => http.post<AdminBlogPost>('/admin/blog/posts', body).then((r) => r.data),
  update: (id: number, body: BlogPostInput) => http.put<AdminBlogPost>(`/admin/blog/posts/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/admin/blog/posts/${id}`).then((r) => r.data),
};
