import type { Post, Comment, GitHubRepo } from "@/shared/types";
import { fetchApi } from "./fetch";

export async function fetchPosts(page = 1, limit = 20) {
  const response = await fetchApi<{
    posts: Post[];
    total: number;
    hasMore: boolean;
  }>(`posts?page=${page}&limit=${limit}`);
  return response.data;
}

export async function createPost(data: {
  content: string;
  images?: string[];
  githubRepo?: GitHubRepo;
}) {
  const response = await fetchApi<Post>("posts", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.data;
}

export async function deletePost(postId: string) {
  return await fetchApi(`posts/${postId}`, {
    method: "DELETE",
  });
}

export async function togglePostLike(postId: string) {
  const response = await fetchApi<{ liked: boolean; likesCount: number }>(
    `posts/${postId}/like`,
    { method: "POST" },
  );
  return response.data;
}

export async function fetchComments(postId: string) {
  const response = await fetchApi<Comment[]>(`posts/${postId}/comments`);
  return response.data;
}

export async function createComment(postId: string, content: string) {
  const response = await fetchApi<Comment>(`posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return response.data;
}

export async function fetchGitHubRepos(page: string) {
  const response = await fetchApi<
    (GitHubRepo & { fullName: string; avatar: string })[]
  >(`github/search?page=${page}`);
  return response;
}

export async function disconnectGitHub() {
  return fetchApi<void>("third-part/oauth/github/connect/disconnect", {
    method: "POST",
  });
}
