import AppKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let output = URL(fileURLWithPath: CommandLine.arguments[1])
let width = 1024
let height = 500
let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmap = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!

func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> CGColor {
    CGColor(colorSpace: colorSpace, components: [r, g, b, a])!
}
func line(_ text: String, _ fontName: String, _ size: CGFloat, _ fill: CGColor, _ x: CGFloat, _ y: CGFloat, kern: CGFloat = 0) {
    let font = CTFontCreateWithName(fontName as CFString, size, nil)
    let attributes: [CFString: Any] = [kCTFontAttributeName: font, kCTForegroundColorAttributeName: fill, kCTKernAttributeName: kern]
    let attributed = CFAttributedStringCreate(nil, text as CFString, attributes as CFDictionary)!
    let shaped = CTLineCreateWithAttributedString(attributed)
    bitmap.textPosition = CGPoint(x: x, y: y)
    CTLineDraw(shaped, bitmap)
}

bitmap.setFillColor(color(0.02, 0.031, 0.039))
bitmap.fill(CGRect(x: 0, y: 0, width: width, height: height))
let glow = CGGradient(colorsSpace: colorSpace, colors: [color(0.07, 0.21, 0.15, 0.72), color(0.04, 0.13, 0.10, 0.30), color(0.02, 0.031, 0.039, 0)] as CFArray, locations: [0, 0.5, 1])!
bitmap.drawRadialGradient(glow, startCenter: CGPoint(x: 744, y: 404), startRadius: 0, endCenter: CGPoint(x: 744, y: 404), endRadius: 760, options: [.drawsAfterEndLocation])

for x in stride(from: 12, through: width, by: 32) {
    for y in stride(from: 12, through: height, by: 32) {
        let opacity = max(0.02, 0.16 - CGFloat(x) / 850 * 0.10 - CGFloat(y) / 900 * 0.07)
        bitmap.setFillColor(color(0.65, 0.84, 0.61, opacity))
        bitmap.fillEllipse(in: CGRect(x: x, y: y, width: 2, height: 2))
    }
}

let badge = CGPath(roundedRect: CGRect(x: 76, y: 366, width: 64, height: 64), cornerWidth: 19, cornerHeight: 19, transform: nil)
let badgeColors = CGGradient(colorsSpace: colorSpace, colors: [color(0.79, 0.98, 0.39), color(0.44, 0.91, 0.71)] as CFArray, locations: [0, 1])!
bitmap.saveGState(); bitmap.addPath(badge); bitmap.clip(); bitmap.drawLinearGradient(badgeColors, start: CGPoint(x: 76, y: 430), end: CGPoint(x: 140, y: 366), options: []); bitmap.restoreGState()
bitmap.setStrokeColor(color(0.027, 0.075, 0.047)); bitmap.setLineWidth(5); bitmap.setLineCap(.round)
bitmap.move(to: CGPoint(x: 108, y: 382)); bitmap.addLine(to: CGPoint(x: 108, y: 414))
bitmap.move(to: CGPoint(x: 92, y: 398)); bitmap.addLine(to: CGPoint(x: 124, y: 398)); bitmap.strokePath()
line("nutritiscan", "Arial-BoldMT", 37, color(0.94, 0.96, 0.94), 159, 382, kern: -1.5)
line("°", "Arial-BoldMT", 24, color(0.79, 0.98, 0.39), 339, 390)
line("YOUR PERSONAL HEALTH COMPANION", "Arial-BoldMT", 16, color(0.60, 0.67, 0.62), 80, 278, kern: 4)

let titleFont = CTFontCreateWithName("Georgia-Bold" as CFString, 61, nil)
let title = CFAttributedStringCreate(nil, "Your health. A clearer picture." as CFString, [kCTFontAttributeName: titleFont, kCTForegroundColorAttributeName: color(0.86, 0.94, 0.84), kCTKernAttributeName: -1.8] as CFDictionary)!
bitmap.textPosition = CGPoint(x: 76, y: 191); CTLineDraw(CTLineCreateWithAttributedString(title), bitmap)
line("A private journal for meals, health notes and questions for your doctor.", "ArialMT", 23, color(0.70, 0.75, 0.72), 80, 147)

bitmap.setStrokeColor(color(1, 1, 1, 0.12)); bitmap.setLineWidth(1); bitmap.move(to: CGPoint(x: 80, y: 97)); bitmap.addLine(to: CGPoint(x: 944, y: 97)); bitmap.strokePath()
bitmap.setFillColor(color(0.60, 0.91, 0.75)); bitmap.fillEllipse(in: CGRect(x: 84, y: 54, width: 10, height: 10))
line("Educational support for all ages · Not a diagnosis or emergency service", "ArialMT", 16, color(0.70, 0.75, 0.72), 106, 55)

let image = bitmap.makeImage()!
let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, image, nil)
precondition(CGImageDestinationFinalize(destination), "Could not write feature graphic PNG")
