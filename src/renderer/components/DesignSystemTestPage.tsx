import React from "react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

export function DesignSystemTestPage() {
  return (
    <div className="min-h-screen bg-background p-8 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-display font-bold text-foreground">Design System Test Page</h1>
          <p className="text-body text-muted-foreground">
            Visual verification of shadcn/ui components with hl7-capture theme
          </p>
        </div>

        {/* Color Palette Section */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Brand, semantic, and HL7 protocol colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brand Colors */}
            <div>
              <h3 className="text-h3 mb-3">Brand Colors</h3>
              <div className="flex gap-4">
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-brand-blue" />
                  <p className="text-small">Brand Blue</p>
                  <code className="text-tiny">#1e3a5f</code>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-brand-teal" />
                  <p className="text-small">Brand Teal</p>
                  <code className="text-tiny">#00bcd4</code>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-brand-light border" />
                  <p className="text-small">Brand Light</p>
                  <code className="text-tiny">#e3f2fd</code>
                </div>
              </div>
            </div>

            {/* Semantic Colors */}
            <div>
              <h3 className="text-h3 mb-3">Semantic Colors</h3>
              <div className="flex gap-4">
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-success" />
                  <p className="text-small">Success</p>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-warning" />
                  <p className="text-small">Warning</p>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-error" />
                  <p className="text-small">Error</p>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-info" />
                  <p className="text-small">Info</p>
                </div>
              </div>
            </div>

            {/* HL7 Protocol Colors */}
            <div>
              <h3 className="text-h3 mb-3">HL7 Protocol Colors</h3>
              <div className="flex gap-4 flex-wrap">
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-hl7-outbound" />
                  <p className="text-small">Outbound</p>
                  <p className="text-tiny">Device → LIS</p>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-hl7-inbound" />
                  <p className="text-small">Inbound</p>
                  <p className="text-tiny">LIS → Device</p>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-hl7-start" />
                  <p className="text-small">Start (0x05)</p>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-hl7-message" />
                  <p className="text-small">Message</p>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-hl7-ack" />
                  <p className="text-small">ACK (0x06)</p>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-md bg-hl7-end" />
                  <p className="text-small">End (0x04)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography Section */}
        <Card>
          <CardHeader>
            <CardTitle>Typography System</CardTitle>
            <CardDescription>Font families and type scale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-display">Display Text (Inter, 32px, Bold)</p>
            </div>
            <div>
              <p className="text-h1">Heading 1 (Inter, 24px, Semibold)</p>
            </div>
            <div>
              <p className="text-h2">Heading 2 (Inter, 20px, Semibold)</p>
            </div>
            <div>
              <p className="text-h3">Heading 3 (Inter, 16px, Semibold)</p>
            </div>
            <div>
              <p className="text-body">Body Text (Inter, 14px, Regular)</p>
            </div>
            <div>
              <p className="text-small">Small Text (Inter, 12px, Regular)</p>
            </div>
            <div>
              <p className="text-tiny">Tiny Text (Inter, 11px, Regular)</p>
            </div>
            <div>
              <code className="font-mono text-small">
                Monospace: JetBrains Mono for hex data (0x05 0x02 0x06)
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Button Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Button Component</CardTitle>
            <CardDescription>All button variants and sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-h3">Variants</h3>
              <div className="flex gap-3 flex-wrap">
                <Button variant="default">Default (Teal)</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-h3">Sizes</h3>
              <div className="flex gap-3 items-center flex-wrap">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">🎨</Button>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-h3">States</h3>
              <div className="flex gap-3 flex-wrap">
                <Button>Normal</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Input Component */}
        <Card>
          <CardHeader>
            <CardTitle>Input Component</CardTitle>
            <CardDescription>Text input with Inter font</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Enter text (e.g., IP address)" />
            <Input placeholder="192.168.1.100" disabled />
            <Input type="password" placeholder="Password input" />
          </CardContent>
        </Card>

        {/* Badge Component */}
        <Card>
          <CardHeader>
            <CardTitle>Badge Component</CardTitle>
            <CardDescription>Status indicators and labels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap items-center">
              <Badge variant="default">Default (Teal)</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <Badge className="bg-hl7-start text-white">Start Marker</Badge>
              <Badge className="bg-hl7-message text-white">Message</Badge>
              <Badge className="bg-hl7-ack text-white">ACK</Badge>
              <Badge className="bg-hl7-end text-white">End Marker</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Card Component</CardTitle>
            <CardDescription>Container with header, content, and shadow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-h3">Nested Card 1</CardTitle>
                  <CardDescription>With subtle shadow (sm)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body">
                    Card content demonstrating proper spacing and typography.
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-h3">Nested Card 2</CardTitle>
                  <CardDescription>With medium shadow (md)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body">Cards use 6px border radius and inherit theme colors.</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Spacing & Shadows */}
        <Card>
          <CardHeader>
            <CardTitle>Spacing & Elevation</CardTitle>
            <CardDescription>4px base unit spacing and shadow system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-h3 mb-3">Spacing Scale</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-xs h-8 bg-brand-teal rounded" />
                  <span className="text-small">xs (4px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-sm h-8 bg-brand-teal rounded" />
                  <span className="text-small">sm (8px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-md h-8 bg-brand-teal rounded" />
                  <span className="text-small">md (16px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-lg h-8 bg-brand-teal rounded" />
                  <span className="text-small">lg (24px)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-xl h-8 bg-brand-teal rounded" />
                  <span className="text-small">xl (32px)</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-h3 mb-3">Shadow System</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white shadow-sm rounded-md">
                  <p className="text-small">shadow-sm</p>
                </div>
                <div className="p-4 bg-white shadow-md rounded-md">
                  <p className="text-small">shadow-md</p>
                </div>
                <div className="p-4 bg-white shadow-lg rounded-md">
                  <p className="text-small">shadow-lg</p>
                </div>
                <div className="p-4 bg-white shadow-xl rounded-md">
                  <p className="text-small">shadow-xl</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Border Radius */}
        <Card>
          <CardHeader>
            <CardTitle>Border Radius System</CardTitle>
            <CardDescription>Consistent corner rounding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-brand-teal rounded-none">
                <p className="text-small text-white">none (0px)</p>
              </div>
              <div className="p-4 bg-brand-teal rounded-sm">
                <p className="text-small text-white">sm (4px)</p>
              </div>
              <div className="p-4 bg-brand-teal rounded-md">
                <p className="text-small text-white">md (6px)</p>
              </div>
              <div className="p-4 bg-brand-teal rounded-lg">
                <p className="text-small text-white">lg (8px)</p>
              </div>
              <div className="p-4 bg-brand-teal rounded-full">
                <p className="text-small text-white">full</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
