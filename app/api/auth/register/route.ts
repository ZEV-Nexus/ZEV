import { userModel } from "@/shared/schema";
import { connectMongoose } from "@/shared/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";

import sendWelcomeEmail from "@/shared/service/email/send-welcome-email";

export async function POST(request: NextRequest) {
  try {
    const { email, password, nickname } = await request.json();
    await connectMongoose();
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return NextResponse.json("User already exists", { status: 409 });
    }
    const hashPassword = await hash(password, 10);
    const baseUsername = email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "");
    let username = baseUsername;
    let suffix = 1;
    while (await userModel.findOne({ username })) {
      username = `${baseUsername}${suffix}`;
      suffix++;
    }
    const newUser = new userModel({
      userId: crypto.randomUUID(),
      username,
      email,
      password: hashPassword,
      nickname,
      emailVerified: false,
      provider: "credentials",
    });
    await newUser.save();
    await sendWelcomeEmail(newUser.nickname!, newUser.email!);

    return NextResponse.json(
      {
        ok: true,
        message: "User registered successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
