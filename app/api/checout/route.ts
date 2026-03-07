import { stripe } from "@/shared/lib/stripe";
import { getCurrentUser } from "@/shared/service/server/auth";
import { apiResponse } from "@/shared/service/server/response";

export async function POST(req: Request) {
  try {
    const { price, productName } = await req.json();
    const user = await getCurrentUser();
    if (!user) {
      return apiResponse({ message: "Unauthorized", status: 401 });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "twd",
            product_data: { name: productName },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/success`,
      cancel_url: `${req.headers.get("origin")}/cancel`,
    });

    return apiResponse({ data: { sessionId: session.id } });
  } catch (err: unknown) {
    return apiResponse({ message: (err as Error).message, status: 500 });
  }
}
