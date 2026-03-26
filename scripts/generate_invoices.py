#!/usr/bin/env python3
"""Generate sample invoice PDFs for OCR scanner testing"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
import os

# Register Japanese font
pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
FONT = 'HeiseiKakuGo-W5'

OUTPUT_DIR = '/home/user/cursor-ai-recipe-management-mock/docs/sample-invoices'


def draw_pattern1(filename):
    """Pattern 1: 築地鮮魚 山田商店 - シンプル縦型"""
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4

    # Header
    c.setFont(FONT, 24)
    c.drawCentredString(w/2, h - 40*mm, '納 品 書')

    c.setFont(FONT, 10)
    c.drawString(20*mm, h - 55*mm, 'レストラン・シトラス 御中')
    c.setFont(FONT, 14)
    c.drawString(20*mm, h - 62*mm, '─' * 20)

    # Supplier info (right side)
    c.setFont(FONT, 10)
    c.drawRightString(w - 20*mm, h - 55*mm, '築地鮮魚 山田商店')
    c.drawRightString(w - 20*mm, h - 61*mm, 'TEL: 03-1234-5678')
    c.drawRightString(w - 20*mm, h - 67*mm, '納品日: 2026年3月25日')
    c.drawRightString(w - 20*mm, h - 73*mm, '伝票No: YM-20260325-01')

    # Table header
    y = h - 90*mm
    c.setFillColor(colors.Color(0.2, 0.3, 0.5))
    c.rect(20*mm, y - 2*mm, w - 40*mm, 8*mm, fill=1)
    c.setFillColor(colors.white)
    c.setFont(FONT, 9)
    cols = [25*mm, 75*mm, 105*mm, 130*mm, 155*mm]
    headers = ['品名', '規格', '数量', '単価', '金額']
    for col, header in zip(cols, headers):
        c.drawString(col, y, header)

    # Items
    items = [
        ('ノルウェーサーモン フィレ', '約1kg/枚', '3枚', '¥2,800', '¥8,400'),
        ('天然マグロ 赤身ブロック', '冷凍 1kg', '2kg', '¥4,500', '¥9,000'),
        ('北海道産ホタテ貝柱 L', '1kg箱', '1.5kg', '¥5,200', '¥7,800'),
        ('ブラックタイガーエビ 16/20', '冷凍 1kg', '2kg', '¥2,400', '¥4,800'),
        ('真鯛 フィレ', '約500g', '2枚', '¥3,200', '¥6,400'),
        ('イカ 刺身用', 'スルメイカ', '1.5kg', '¥1,800', '¥2,700'),
    ]

    c.setFillColor(colors.black)
    c.setFont(FONT, 9)
    y -= 12*mm
    for i, (name, spec, qty, price, amount) in enumerate(items):
        if i % 2 == 0:
            c.setFillColor(colors.Color(0.95, 0.95, 0.97))
            c.rect(20*mm, y - 3*mm, w - 40*mm, 8*mm, fill=1)
        c.setFillColor(colors.black)
        c.drawString(25*mm, y, name)
        c.drawString(75*mm, y, spec)
        c.drawRightString(120*mm, y, qty)
        c.drawRightString(148*mm, y, price)
        c.drawRightString(178*mm, y, amount)
        y -= 9*mm

    # Totals
    y -= 5*mm
    c.setLineWidth(0.5)
    c.line(120*mm, y + 3*mm, 180*mm, y + 3*mm)
    c.setFont(FONT, 10)
    c.drawString(120*mm, y - 5*mm, '小計')
    c.drawRightString(178*mm, y - 5*mm, '¥39,100')
    c.drawString(120*mm, y - 14*mm, '消費税(8%)')
    c.drawRightString(178*mm, y - 14*mm, '¥3,128')
    c.setFont(FONT, 12)
    c.line(120*mm, y - 18*mm, 180*mm, y - 18*mm)
    c.drawString(120*mm, y - 28*mm, '合計金額')
    c.drawRightString(178*mm, y - 28*mm, '¥42,228')

    # Stamp area
    c.setFont(FONT, 8)
    c.setStrokeColor(colors.gray)
    c.rect(20*mm, 20*mm, 25*mm, 25*mm)
    c.drawCentredString(32.5*mm, 23*mm, '受領印')

    c.save()


def draw_pattern2(filename):
    """Pattern 2: 大田青果市場 佐藤 - 手書き風・横型"""
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=(A4[1], A4[0]))  # Landscape
    w, h = A4[1], A4[0]

    # Simple border
    c.setStrokeColor(colors.Color(0.3, 0.5, 0.3))
    c.setLineWidth(2)
    c.rect(10*mm, 10*mm, w - 20*mm, h - 20*mm)

    # Header
    c.setFont(FONT, 20)
    c.drawString(20*mm, h - 25*mm, '納品書')
    c.setFont(FONT, 10)
    c.drawString(20*mm, h - 33*mm, 'レストラン・シトラス 様')

    c.setFont(FONT, 12)
    c.drawRightString(w - 20*mm, h - 22*mm, '大田青果市場 佐藤')
    c.setFont(FONT, 9)
    c.drawRightString(w - 20*mm, h - 29*mm, '担当: 佐藤花子')
    c.drawRightString(w - 20*mm, h - 35*mm, '2026/03/26')
    c.drawRightString(w - 20*mm, h - 41*mm, 'No.S-0326-A')

    # Table
    y = h - 52*mm
    c.setLineWidth(0.5)
    c.setStrokeColor(colors.black)

    # Header row
    c.setFillColor(colors.Color(0.85, 0.93, 0.85))
    c.rect(15*mm, y - 2*mm, w - 30*mm, 9*mm, fill=1)
    c.setFillColor(colors.black)
    c.setFont(FONT, 9)
    row_x = [20*mm, 80*mm, 120*mm, 155*mm, 195*mm, 235*mm]
    for x, h_text in zip(row_x, ['商品名', '産地', '数量', '単位', '単価(税抜)', '金額']):
        c.drawString(x, y, h_text)

    items = [
        ('玉ねぎ L', '北海道', '10', 'kg', '180', '1,800'),
        ('にんじん M', '千葉', '5', 'kg', '250', '1,250'),
        ('メークイン L', '北海道', '8', 'kg', '200', '1,600'),
        ('レタス', '長野', '10', '個', '150', '1,500'),
        ('桃太郎トマト M', '熊本', '5', 'kg', '450', '2,250'),
        ('レモン', '輸入', '20', '個', '80', '1,600'),
        ('ほうれん草', '群馬', '3', 'kg', '380', '1,140'),
        ('大葉', '愛知', '5', '束', '120', '600'),
        ('しめじ', '長野', '2', 'kg', '560', '1,120'),
        ('アボカド', '輸入', '10', '個', '180', '1,800'),
    ]

    y -= 11*mm
    c.setFont(FONT, 9)
    for i, (name, origin, qty, unit, price, amount) in enumerate(items):
        if i % 2 == 1:
            c.setFillColor(colors.Color(0.96, 0.98, 0.96))
            c.rect(15*mm, y - 3*mm, w - 30*mm, 8*mm, fill=1)
        c.setFillColor(colors.black)
        c.drawString(20*mm, y, name)
        c.drawString(80*mm, y, origin)
        c.drawRightString(135*mm, y, qty)
        c.drawString(155*mm, y, unit)
        c.drawRightString(218*mm, y, '¥' + price)
        c.drawRightString(258*mm, y, '¥' + amount)
        y -= 8*mm

    # Totals
    y -= 5*mm
    c.setLineWidth(1)
    c.line(180*mm, y + 3*mm, 262*mm, y + 3*mm)
    c.setFont(FONT, 10)
    c.drawRightString(230*mm, y - 4*mm, '税抜合計:')
    c.drawRightString(262*mm, y - 4*mm, '¥14,660')
    c.drawRightString(230*mm, y - 13*mm, '消費税(8%):')
    c.drawRightString(262*mm, y - 13*mm, '¥1,173')
    c.setLineWidth(1.5)
    c.line(180*mm, y - 17*mm, 262*mm, y - 17*mm)
    c.setFont(FONT, 12)
    c.drawRightString(230*mm, y - 27*mm, '合計:')
    c.drawRightString(262*mm, y - 27*mm, '¥15,833')

    c.save()


def draw_pattern3(filename):
    """Pattern 3: 肉のミヤザキ - フォーマル・罫線重視"""
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4

    # Double border
    c.setStrokeColor(colors.Color(0.5, 0.1, 0.1))
    c.setLineWidth(2)
    c.rect(12*mm, 12*mm, w - 24*mm, h - 24*mm)
    c.setLineWidth(0.5)
    c.rect(14*mm, 14*mm, w - 28*mm, h - 28*mm)

    # Title with decorative line
    c.setFont(FONT, 28)
    c.setFillColor(colors.Color(0.5, 0.1, 0.1))
    c.drawCentredString(w/2, h - 35*mm, '納 品 書')
    c.setLineWidth(1)
    c.setStrokeColor(colors.Color(0.5, 0.1, 0.1))
    c.line(60*mm, h - 38*mm, w - 60*mm, h - 38*mm)

    # Info section
    c.setFillColor(colors.black)
    c.setFont(FONT, 11)
    c.drawString(20*mm, h - 52*mm, 'お届け先: レストラン・シトラス 様')
    c.setFont(FONT, 9)
    c.drawString(20*mm, h - 60*mm, '納品日: 2026年3月24日(火)')
    c.drawString(20*mm, h - 67*mm, '配送便: 午前便')

    c.setFont(FONT, 14)
    c.drawRightString(w - 20*mm, h - 50*mm, '肉のミヤザキ')
    c.setFont(FONT, 9)
    c.drawRightString(w - 20*mm, h - 57*mm, '〒143-0001 東京都大田区東海3-2-1')
    c.drawRightString(w - 20*mm, h - 63*mm, 'TEL: 03-3456-7890 / FAX: 03-3456-7891')
    c.drawRightString(w - 20*mm, h - 69*mm, '担当: 宮崎健太')
    c.drawRightString(w - 20*mm, h - 75*mm, '伝票番号: MK-2026-0324-003')

    # Table with full grid
    y_start = h - 88*mm
    col_widths = [70*mm, 30*mm, 25*mm, 25*mm, 30*mm]
    col_x = [20*mm]
    for cw in col_widths:
        col_x.append(col_x[-1] + cw)

    # Header
    c.setFillColor(colors.Color(0.5, 0.1, 0.1))
    c.rect(20*mm, y_start - 2*mm, sum(col_widths), 9*mm, fill=1)
    c.setFillColor(colors.white)
    c.setFont(FONT, 9)
    headers = ['品名・部位', '重量(g)', '単位', '単価(円/g)', '金額(円)']
    for i, header in enumerate(headers):
        c.drawCentredString(col_x[i] + col_widths[i]/2, y_start, header)

    items = [
        ('宮崎牛A4 サーロイン', '2,000', 'g', '8.50', '17,000'),
        ('宮崎牛A4 リブロース', '1,500', 'g', '9.20', '13,800'),
        ('国産鶏もも肉', '5,000', 'g', '0.98', '4,900'),
        ('国産豚ロース', '3,000', 'g', '1.60', '4,800'),
        ('合挽き肉(牛7:豚3)', '4,000', 'g', '1.20', '4,800'),
        ('国産鶏むね肉', '3,000', 'g', '0.68', '2,040'),
        ('豚バラ ブロック', '2,000', 'g', '1.40', '2,800'),
    ]

    c.setFillColor(colors.black)
    c.setFont(FONT, 9)
    y = y_start - 11*mm
    for i, (name, weight, unit, price, amount) in enumerate(items):
        # Grid lines
        c.setStrokeColor(colors.Color(0.8, 0.8, 0.8))
        c.setLineWidth(0.3)
        for cx in col_x:
            c.line(cx, y - 3*mm, cx, y + 6*mm)
        c.line(20*mm, y - 3*mm, col_x[-1], y - 3*mm)

        c.setFillColor(colors.black)
        c.drawString(22*mm, y, name)
        c.drawRightString(col_x[2] - 3*mm, y, weight)
        c.drawCentredString(col_x[2] + col_widths[2]/2, y, unit)
        c.drawRightString(col_x[4] - 3*mm, y, '¥' + price)
        c.drawRightString(col_x[5] - 3*mm, y, '¥' + amount)
        y -= 9*mm

    # Bottom border of table
    c.setStrokeColor(colors.Color(0.5, 0.1, 0.1))
    c.setLineWidth(1)
    c.line(20*mm, y + 6*mm, col_x[-1], y + 6*mm)

    # Totals
    y -= 8*mm
    c.setFont(FONT, 10)
    c.drawRightString(col_x[4] - 3*mm, y, '小計:')
    c.drawRightString(col_x[5] - 3*mm, y, '¥50,140')
    y -= 10*mm
    c.drawRightString(col_x[4] - 3*mm, y, '消費税(10%):')
    c.drawRightString(col_x[5] - 3*mm, y, '¥5,014')
    y -= 3*mm
    c.setLineWidth(1.5)
    c.setStrokeColor(colors.Color(0.5, 0.1, 0.1))
    c.line(120*mm, y, col_x[-1], y)
    y -= 12*mm
    c.setFont(FONT, 14)
    c.drawRightString(col_x[4] - 3*mm, y, '合計金額:')
    c.drawRightString(col_x[5] - 3*mm, y, '¥55,154')

    # Notes
    y -= 25*mm
    c.setFont(FONT, 8)
    c.setFillColor(colors.gray)
    c.drawString(20*mm, y, '※ 宮崎牛は全てA4ランク以上です。')
    c.drawString(20*mm, y - 8*mm, '※ お支払い: 月末締め翌月末払い')
    c.drawString(20*mm, y - 16*mm, '※ 返品・交換は納品日翌日までにご連絡ください。')

    c.save()


if __name__ == '__main__':
    draw_pattern1('invoice-fish-yamada.pdf')
    draw_pattern2('invoice-vegetable-sato.pdf')
    draw_pattern3('invoice-meat-miyazaki.pdf')
    print('Generated 3 invoice PDFs in', OUTPUT_DIR)
