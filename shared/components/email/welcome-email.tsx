import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { emailTailwindConfig } from "@/shared/lib/email-tailwind-config";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const ZEVWelcomeEmail = ({ name }: { name: string }) => (
  <Html>
    <Head />
    <Tailwind config={emailTailwindConfig}>
      <Body className="bg-secondary  ">
        <Preview>
          Hello {name}, Welcome to ZEV! 🎉 I&apos;m Yuzen, the developer behind
          this platform, and I&apos;m genuinely excited to have you join us.
        </Preview>
        <Container className="bg-white mx-auto py-5 pb-12 mb-16">
          <Section className="px-12">
            <Img
              src={`${baseUrl}/icons/logo-with-text-light-removebg.png`}
              width="100"
              className=" aspect-video object-cover"
              height="32"
              alt="ZEV"
            />
            <Hr className="border-[#e6ebf1] my-5" />
            <Text className="text-foreground text-base leading-6 text-left">
              Hello {name},
            </Text>
            <Text className="text-foreground text-base leading-6 text-left">
              Welcome to ZEV! 🎉
              <br /> I&apos;m Yuzen, the developer behind this platform, and
              I&apos;m genuinely excited to have you join us.
            </Text>
            <Text className="text-foreground text-base leading-6 text-left">
              Your account is now fully set up, which means you&apos;re ready to
              start exploring everything ZEV offers. You can begin new
              conversations, continue previous chats, and manage your personal
              profile directly from your dashboard.
            </Text>
            <Button
              className="bg-primary rounded-[3px] text-white text-[16px] font-bold no-underline text-center block p-2.5"
              href={`${baseUrl}/auth/login`}
            >
              Start ZEV
            </Button>
            <Hr className="border-[#e6ebf1] my-5" />
            <Text className="text-foreground text-base leading-6 text-left">
              If you did not register for ZEV, please feel free to ignore this
              email or reply to this message so I can help you resolve the
              issue.
            </Text>
            <Text className="text-foreground text-base leading-6 text-left">
              If you did not register for ZEV, please feel free to ignore this
              email or reply to this message so I can help you resolve the
              issue. If you run into any problems, you may want to check:
              <br /> • Whether you can log in successfully <br /> • Try
              refreshing the page and signing in again
            </Text>

            <Text className="text-muted-foreground text-xs   text-left">
              Best regards,
              <br />
              Yuzen
              <br /> ZEV Developer
            </Text>
            <Text className="text-muted-foreground text-xs   text-left"></Text>
            <Text className="text-muted-foreground text-xs   text-left"></Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default ZEVWelcomeEmail;
