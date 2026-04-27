import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface MagicLinkEmailProps {
  url: string;
  recipientName: string;
}

export function MagicLinkEmail({ url, recipientName }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Sunday Fun Day sign-in link</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Sunday Fun Day</Heading>
          <Text style={paragraph}>Hey {recipientName},</Text>
          <Text style={paragraph}>
            Tap the button below to sign in. The link is good for 10 minutes and can only be used
            once.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button href={url} style={button}>
              Sign in
            </Button>
          </Section>
          <Text style={small}>
            If the button doesn&apos;t work, paste this URL into your browser:
            <br />
            <span style={{ wordBreak: "break-all" }}>{url}</span>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>If you didn&apos;t request this, you can ignore the email.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail;

const body: React.CSSProperties = {
  backgroundColor: "#f5f5f4",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 12,
  margin: "24px auto",
  maxWidth: 480,
  padding: "32px 28px",
};

const heading: React.CSSProperties = {
  color: "#0f5132",
  fontSize: 24,
  fontWeight: 700,
  margin: "0 0 16px",
};

const paragraph: React.CSSProperties = {
  color: "#1c1917",
  fontSize: 16,
  lineHeight: 1.5,
  margin: "0 0 12px",
};

const button: React.CSSProperties = {
  backgroundColor: "#0f5132",
  borderRadius: 999,
  color: "#ffffff",
  display: "inline-block",
  fontSize: 16,
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};

const small: React.CSSProperties = {
  color: "#57534e",
  fontSize: 13,
  lineHeight: 1.5,
};

const hr: React.CSSProperties = {
  borderColor: "#e7e5e4",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  color: "#78716c",
  fontSize: 12,
};
