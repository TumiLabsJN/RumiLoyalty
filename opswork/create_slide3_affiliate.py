import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

# Create figure
fig, ax = plt.subplots(1, 1, figsize=(16, 9))
ax.set_xlim(0, 16)
ax.set_ylim(0, 9)
ax.axis('off')
fig.patch.set_facecolor('white')

# Title
ax.text(8, 8.3, 'WHY AFFILIATE CONTENT WORKS', fontsize=24, fontweight='bold',
        ha='center', va='center', color='#1a1a2e')
ax.text(8, 7.7, '5 Engagement Drivers & Who Uses Them Best', fontsize=13,
        ha='center', va='center', color='#666666', style='italic')

# Card definitions - 5 semantic meta-categories (PRODUCT DEMO removed - skewed to 1 creator)
cards = [
    {
        'title': 'PERSONAL',
        'subtitle': 'TESTIMONY',
        'color': '#27ae60',  # Green
        'bg': '#eafaf1',
        'reach': '4/7 (57%)',
        'bullets': ['• First-person Story', '• Real Testimonials', '• Life Wisdom'],
        'top_affiliate': '@realkalimuscle',
        'top_pct': '76%'
    },
    {
        'title': 'TRANSFORM-',
        'subtitle': 'ATION',
        'color': '#3498db',  # Blue
        'bg': '#ebf5fb',
        'reach': '3/7 (43%)',
        'bullets': ['• Before/After', '• Results Reveal', '• Progress Mention'],
        'top_affiliate': '@realkalimuscle',
        'top_pct': '63%'
    },
    {
        'title': 'CREDI-',
        'subtitle': 'BILITY',
        'color': '#f39c12',  # Orange
        'bg': '#fef9e7',
        'reach': '3/7 (43%)',
        'bullets': ['• Price Comparison', '• Expert Citation', '• Science Explain'],
        'top_affiliate': '@realkalimuscle',
        'top_pct': '51%'
    },
    {
        'title': 'DIRECT',
        'subtitle': 'ENGAGEMENT',
        'color': '#1abc9c',  # Teal
        'bg': '#e8f8f5',
        'reach': '3/7 (43%)',
        'bullets': ['• Reply Comments', '• Viewer Address', '• Confrontation'],
        'top_affiliate': '@realmrchicago',
        'top_pct': '76%'
    },
    {
        'title': 'URGENCY',
        'subtitle': '& SCARCITY',
        'color': '#e74c3c',  # Red
        'bg': '#fdedec',
        'reach': '2/7 (29%)',
        'bullets': ['• Countdown Live', '• Limited Time', '• Scarcity Msg'],
        'top_affiliate': '@realmrchicago',
        'top_pct': '67%'
    }
]

# Card dimensions
card_width = 2.8
card_height = 5.5
start_x = 0.8
start_y = 1.2
gap = 0.35

for i, card in enumerate(cards):
    x = start_x + i * (card_width + gap)
    y = start_y

    # Card background
    rect = FancyBboxPatch((x, y), card_width, card_height,
                          boxstyle="round,pad=0.02,rounding_size=0.12",
                          facecolor=card['bg'], edgecolor=card['color'],
                          linewidth=2)
    ax.add_patch(rect)

    # Title (two lines)
    ax.text(x + card_width/2, y + card_height - 0.4, card['title'],
            fontsize=12, fontweight='bold', ha='center', va='center',
            color=card['color'])
    ax.text(x + card_width/2, y + card_height - 0.75, card['subtitle'],
            fontsize=12, fontweight='bold', ha='center', va='center',
            color=card['color'])

    # Reach indicator
    ax.text(x + card_width/2, y + card_height - 1.1, card['reach'],
            fontsize=9, ha='center', va='center',
            color='#888888', style='italic')

    # Separator line
    ax.plot([x + 0.3, x + card_width - 0.3], [y + card_height - 1.35, y + card_height - 1.35],
            color=card['color'], linewidth=1, alpha=0.5)

    # Bullets
    bullet_y = y + card_height - 1.7
    for bullet in card['bullets']:
        ax.text(x + 0.2, bullet_y, bullet, fontsize=9, ha='left', va='center',
                color='#555555')
        bullet_y -= 0.4

    # TOP PERFORMER section
    ax.text(x + card_width/2, y + 1.8, 'TOP PERFORMER',
            fontsize=8, fontweight='bold', ha='center', va='center',
            color='#888888', style='italic')

    # Separator line
    ax.plot([x + 0.3, x + card_width - 0.3], [y + 1.55, y + 1.55],
            color='#cccccc', linewidth=0.5)

    # Top performer name and %
    ax.text(x + card_width/2, y + 1.1, card['top_affiliate'], fontsize=10, fontweight='bold',
            ha='center', va='center', color='#333333')
    ax.text(x + card_width/2, y + 0.6, card['top_pct'], fontsize=14, fontweight='bold',
            ha='center', va='center', color=card['color'])

# Footer
ax.text(8, 0.5, 'Analysis based on 7 top-performing supplement affiliates on TikTok (semantic grouping)',
        fontsize=9, ha='center', va='center', color='#999999', style='italic')

plt.tight_layout()
plt.savefig('/home/jorge/Loyalty/opswork/Slide3_AffiliateEngagementDrivers.png',
            dpi=150, bbox_inches='tight', facecolor='white', edgecolor='none')
plt.close()

print("Slide 3 saved: Slide3_AffiliateEngagementDrivers.png (5 categories)")
