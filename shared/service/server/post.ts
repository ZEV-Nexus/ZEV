import { postModel, commentModel, userModel } from "@/shared/schema";
import { connectMongoose } from "@/shared/lib/mongoose";

const POSTS_PER_PAGE = 20;

export async function createPost({
  authorId,
  content,
  images,
  githubRepo,
}: {
  authorId: string;
  content: string;
  images?: string[];
  githubRepo?: {
    owner: string;
    repo: string;
    url: string;
    description?: string;
    stars?: number;
    language?: string;
    forks?: number;
  };
}) {
  await connectMongoose();
  const post = await postModel.create({
    author: authorId,
    content,
    images: images || [],
    githubRepo: githubRepo || undefined,
  });

  const populated = await post.populate(
    "author",
    "userId username nickname avatar",
  );
  return populated;
}

export async function getPosts({
  page = 1,
  limit = POSTS_PER_PAGE,
}: {
  page?: number;
  limit?: number;
} = {}) {
  await connectMongoose();
  const skip = (page - 1) * limit;

  const posts = await postModel
    .find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("author", "userId username nickname avatar");

  const total = await postModel.countDocuments({ deletedAt: null });

  return {
    posts,
    total,
    hasMore: skip + posts.length < total,
  };
}

export async function getPostById(postId: string) {
  await connectMongoose();
  const post = await postModel
    .findById(postId)
    .populate("author", "userId username nickname avatar");

  return post ? post.toJSON() : null;
}

export async function toggleLike(postId: string, userId: string) {
  await connectMongoose();

  // Get the user's ObjectId
  const user = await userModel.findOne({ userId });
  if (!user) throw new Error("User not found");

  const post = await postModel.findById(postId);
  if (!post) throw new Error("Post not found");

  const userObjectId = user._id;
  const alreadyLiked = post.likes?.some(
    (id) => id?.toString() === userObjectId.toString(),
  );

  if (alreadyLiked) {
    await postModel.findByIdAndUpdate(postId, {
      $pull: { likes: userObjectId },
    });
  } else {
    await postModel.findByIdAndUpdate(postId, {
      $addToSet: { likes: userObjectId },
    });
  }

  const updated = await postModel.findById(postId);
  return {
    liked: !alreadyLiked,
    likesCount: updated?.likes?.length || 0,
  };
}

export async function deletePost(postId: string, userId: string) {
  await connectMongoose();
  const post = await postModel
    .findById(postId)
    .populate<{ author: { id: string; userId: string } }>("author");
  if (!post) throw new Error("Post not found");

  const author = post.author;
  if (author.userId !== userId) {
    throw new Error("Unauthorized");
  }

  post.deletedAt = new Date();
  await post.save();
  return true;
}

export async function getCommentsByPost(postId: string) {
  await connectMongoose();
  const comments = await commentModel
    .find({ post: postId, deletedAt: null })
    .sort({ createdAt: 1 })
    .populate("author", "userId username nickname avatar");

  return JSON.parse(JSON.stringify(comments));
}

export async function createComment({
  postId,
  authorId,
  content,
}: {
  postId: string;
  authorId: string;
  content: string;
}) {
  await connectMongoose();

  const comment = await commentModel.create({
    post: postId,
    author: authorId,
    content,
  });

  // Increment comment count
  await postModel.findByIdAndUpdate(postId, {
    $inc: { commentCount: 1 },
  });

  const populated = await comment.populate(
    "author",
    "userId username nickname avatar",
  );
  return JSON.parse(JSON.stringify(populated));
}
