import express, { Request, Response } from 'express';
import { getDatabase } from '../config/database.js';
import { requireAuth } from './auth.js';
import { randomBytes } from 'crypto';
import { discordNotifications } from '../services/discordNotifications.js';
import itemDefs from '../data/itemdefs.json' assert { type: 'json' };

const router = express.Router();

// Helper function to get item name by ID
function getItemName(itemId: number): string {
  const item = (itemDefs as any[]).find((item: any) => item._id === itemId);
  return item?.name || 'Unknown Item';
}

// Get all active listings
router.get('/listings', async (_req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const listings = await db.all(`
      SELECT 
        l.*,
        u.username as seller_name,
        u.discord_id as seller_discord_id,
        u.discriminator as seller_discriminator,
        u.avatar as seller_avatar,
        u.created_at as seller_joined_date,
        (SELECT COUNT(*) FROM marketplace_offers o WHERE o.listing_id = l.id AND o.status = 'pending') as offer_count
      FROM marketplace_listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
      ORDER BY l.created_at DESC
    `);
    
    res.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Create a new listing
router.post('/listings', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId, quantity, askingPrice, acceptsItems, notes } = req.body;
    const userId = (req.user as any)!.id!;

    if (!itemId || !quantity || !askingPrice) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const db = await getDatabase();
    const listingId = randomBytes(16).toString('hex');

    await db.run(`
      INSERT INTO marketplace_listings (id, user_id, item_id, quantity, asking_price, accepts_items, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [listingId, userId, itemId, quantity, askingPrice, acceptsItems ? 1 : 0, notes || '']);

    // Return the created listing with user info
    const listing = await db.get(`
      SELECT 
        l.*,
        u.username as seller_name,
        u.discord_id as seller_discord_id,
        u.discriminator as seller_discriminator,
        u.avatar as seller_avatar,
        u.created_at as seller_joined_date,
        (SELECT COUNT(*) FROM marketplace_offers o WHERE o.listing_id = l.id AND o.status = 'pending') as offer_count
      FROM marketplace_listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `, [listingId]);

    // Send Discord notification
    try {
      const user = (req.user as any);
      await discordNotifications.notifyListingCreated(
        {
          discordId: user.discord_id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar
        },
        {
          id: listingId,
          itemName: getItemName(itemId),
          quantity,
          askingPrice,
          acceptsItems,
          notes
        }
      );
    } catch (notificationError) {
      console.error('Failed to send Discord notification for listing creation:', notificationError);
      // Don't fail the request if notification fails
    }

    res.status(201).json(listing);
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// Delete a listing (only by owner)
router.delete('/listings/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = req.params.id;
    const userId = (req.user as any)!.id!;
    const db = await getDatabase();

    // Check if listing exists and belongs to user
    const listing = await db.get(`
      SELECT l.*, u.username, u.discord_id, u.discriminator, u.avatar 
      FROM marketplace_listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ? AND l.user_id = ? AND l.status = 'active'
    `, [listingId, userId]);

    if (!listing) {
      res.status(404).json({ error: 'Listing not found or not authorized' });
      return;
    }

    // Update listing status to 'removed'
    await db.run(`
      UPDATE marketplace_listings 
      SET status = 'removed', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [listingId]);

    // Send Discord notification
    try {
      await discordNotifications.notifyListingRemoved(
        {
          discordId: listing.discord_id,
          username: listing.username,
          discriminator: listing.discriminator,
          avatar: listing.avatar
        },
        {
          id: listingId,
          itemName: getItemName(listing.item_id),
          quantity: listing.quantity,
          askingPrice: listing.asking_price,
          acceptsItems: listing.accepts_items === 1,
          notes: listing.notes
        }
      );
    } catch (notificationError) {
      console.error('Failed to send Discord notification for listing removal:', notificationError);
    }

    res.json({ message: 'Listing removed successfully' });
  } catch (error) {
    console.error('Error removing listing:', error);
    res.status(500).json({ error: 'Failed to remove listing' });
  }
});

// Get offers for a listing (public endpoint)
router.get('/listings/:id/offers', async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = req.params.id;
    const db = await getDatabase();

    // Check if listing exists and is active
    const listing = await db.get(`
      SELECT * FROM marketplace_listings 
      WHERE id = ? AND status = 'active'
    `, [listingId]);

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Get offers with user info and offer items (public view)
    const offers = await db.all(`
      SELECT 
        o.*,
        u.username as buyer_name,
        u.discord_id as buyer_discord_id,
        u.discriminator as buyer_discriminator,
        u.avatar as buyer_avatar
      FROM marketplace_offers o
      JOIN users u ON o.user_id = u.id
      WHERE o.listing_id = ? AND o.status = 'pending'
      ORDER BY o.created_at DESC
    `, [listingId]);

    // Get offer items for each offer
    for (const offer of offers) {
      const offerItems = await db.all(`
        SELECT * FROM marketplace_offer_items 
        WHERE offer_id = ?
      `, [offer.id]);
      offer.item_offers = offerItems;
    }

    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Get offers for a listing (owner management endpoint)
router.get('/listings/:id/offers/manage', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = req.params.id;
    const userId = (req.user as any)!.id!;
    const db = await getDatabase();

    // Verify user owns the listing
    const listing = await db.get(`
      SELECT * FROM marketplace_listings 
      WHERE id = ? AND user_id = ?
    `, [listingId, userId]);

    if (!listing) {
      res.status(404).json({ error: 'Listing not found or not authorized' });
      return;
    }

    // Get offers with user info and offer items
    const offers = await db.all(`
      SELECT 
        o.*,
        u.username as buyer_name,
        u.discord_id as buyer_discord_id,
        u.discriminator as buyer_discriminator,
        u.avatar as buyer_avatar
      FROM marketplace_offers o
      JOIN users u ON o.user_id = u.id
      WHERE o.listing_id = ? AND o.status = 'pending'
      ORDER BY o.created_at DESC
    `, [listingId]);

    // Get offer items for each offer
    for (const offer of offers) {
      const offerItems = await db.all(`
        SELECT * FROM marketplace_offer_items 
        WHERE offer_id = ?
      `, [offer.id]);
      offer.item_offers = offerItems;
    }

    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Create an offer on a listing
router.post('/listings/:id/offers', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = req.params.id;
    const userId = (req.user as any)!.id!;
    const { coinOffer, itemOffers, message } = req.body;
    const db = await getDatabase();

    // Check if listing exists and is active
    const listing = await db.get(`
      SELECT * FROM marketplace_listings 
      WHERE id = ? AND status = 'active'
    `, [listingId]);

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Don't allow offers on own listings
    if (listing.user_id === userId) {
      res.status(400).json({ error: 'Cannot make offers on your own listings' });
      return;
    }

    const offerId = randomBytes(16).toString('hex');

    // Create the offer
    await db.run(`
      INSERT INTO marketplace_offers (id, listing_id, user_id, coin_offer, message)
      VALUES (?, ?, ?, ?, ?)
    `, [offerId, listingId, userId, coinOffer || 0, message || '']);

    // Add item offers if any
    if (itemOffers && itemOffers.length > 0) {
      for (const itemOffer of itemOffers) {
        if (itemOffer.itemId && itemOffer.quantity > 0) {
          await db.run(`
            INSERT INTO marketplace_offer_items (offer_id, item_id, quantity)
            VALUES (?, ?, ?)
          `, [offerId, itemOffer.itemId, itemOffer.quantity]);
        }
      }
    }

    // Return the created offer with user info
    const offer = await db.get(`
      SELECT 
        o.*,
        u.username as buyer_name,
        u.discord_id as buyer_discord_id,
        u.discriminator as buyer_discriminator,
        u.avatar as buyer_avatar
      FROM marketplace_offers o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [offerId]);

    // Get offer items
    const offerItems = await db.all(`
      SELECT * FROM marketplace_offer_items 
      WHERE offer_id = ?
    `, [offerId]);
    offer.item_offers = offerItems;

    // Send Discord notification to listing owner
    try {
      const listingOwner = await db.get(`
        SELECT u.* FROM users u
        JOIN marketplace_listings l ON u.id = l.user_id
        WHERE l.id = ?
      `, [listingId]);

      if (listingOwner) {
        await discordNotifications.notifyOfferReceived(
          {
            discordId: listingOwner.discord_id,
            username: listingOwner.username,
            discriminator: listingOwner.discriminator,
            avatar: listingOwner.avatar
          },
          {
            id: listingId,
            itemName: getItemName(listing.item_id),
            quantity: listing.quantity,
            askingPrice: listing.asking_price,
            acceptsItems: listing.accepts_items === 1,
            notes: listing.notes
          },
          {
            id: offerId,
            listingId: listingId,
            coinOffer: coinOffer || 0,
            message: message || '',
            buyerName: offer.buyer_name,
            buyerDiscordId: offer.buyer_discord_id
          }
        );
      }
    } catch (notificationError) {
      console.error('Failed to send Discord notification for new offer:', notificationError);
    }

    res.status(201).json(offer);
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// Accept an offer (only by listing owner)
router.post('/offers/:id/accept', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const offerId = req.params.id;
    const userId = (req.user as any)!.id!;
    const db = await getDatabase();

    // Get offer and verify user owns the listing
    const offer = await db.get(`
      SELECT o.*, l.user_id as listing_owner_id, l.id as listing_id
      FROM marketplace_offers o
      JOIN marketplace_listings l ON o.listing_id = l.id
      WHERE o.id = ? AND l.user_id = ? AND o.status = 'pending'
    `, [offerId, userId]);

    if (!offer) {
      res.status(404).json({ error: 'Offer not found or not authorized' });
      return;
    }

    // Update offer status to accepted
    await db.run(`
      UPDATE marketplace_offers 
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [offerId]);

    // Update listing status to sold
    await db.run(`
      UPDATE marketplace_listings 
      SET status = 'sold', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [offer.listing_id]);

    // Reject all other pending offers for this listing
    await db.run(`
      UPDATE marketplace_offers 
      SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
      WHERE listing_id = ? AND id != ? AND status = 'pending'
    `, [offer.listing_id, offerId]);

    // Send Discord notifications
    try {
      // Get listing details and buyer info for notifications
      const listingDetails = await db.get(`
        SELECT l.*, u.discord_id as buyer_discord_id, u.username as buyer_name, u.discriminator as buyer_discriminator, u.avatar as buyer_avatar
        FROM marketplace_listings l
        JOIN marketplace_offers o ON l.id = o.listing_id
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [offerId]);

      if (listingDetails) {
        // Notify buyer that their offer was accepted
        await discordNotifications.notifyOfferAccepted(
          {
            discordId: listingDetails.buyer_discord_id,
            username: listingDetails.buyer_name,
            discriminator: listingDetails.buyer_discriminator,
            avatar: listingDetails.buyer_avatar
          },
          {
            id: listingDetails.id,
            itemName: getItemName(listingDetails.item_id),
            quantity: listingDetails.quantity,
            askingPrice: listingDetails.asking_price,
            acceptsItems: listingDetails.accepts_items === 1,
            notes: listingDetails.notes
          },
          {
            id: offerId,
            listingId: offer.listing_id,
            coinOffer: offer.coin_offer,
            message: offer.message,
            buyerName: listingDetails.buyer_name
          }
        );
      }
    } catch (notificationError) {
      console.error('Failed to send Discord notification for offer acceptance:', notificationError);
    }

    res.json({ message: 'Offer accepted successfully' });
  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// Reject an offer (only by listing owner)
router.post('/offers/:id/reject', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const offerId = req.params.id;
    const userId = (req.user as any).id;
    const db = await getDatabase();

    // Get offer and verify user owns the listing
    const offer = await db.get(`
      SELECT o.*
      FROM marketplace_offers o
      JOIN marketplace_listings l ON o.listing_id = l.id
      WHERE o.id = ? AND l.user_id = ? AND o.status = 'pending'
    `, [offerId, userId]);

    if (!offer) {
      res.status(404).json({ error: 'Offer not found or not authorized' });
      return;
    }

    // Update offer status to rejected
    await db.run(`
      UPDATE marketplace_offers 
      SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [offerId]);

    // Send Discord notification to buyer
    try {
      const offerDetails = await db.get(`
        SELECT o.*, l.*, u.discord_id, u.username, u.discriminator, u.avatar
        FROM marketplace_offers o
        JOIN marketplace_listings l ON o.listing_id = l.id
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [offerId]);

      if (offerDetails) {
        await discordNotifications.notifyOfferRejected(
          {
            discordId: offerDetails.discord_id,
            username: offerDetails.username,
            discriminator: offerDetails.discriminator,
            avatar: offerDetails.avatar
          },
          {
            id: offerDetails.listing_id,
            itemName: getItemName(offerDetails.item_id),
            quantity: offerDetails.quantity,
            askingPrice: offerDetails.asking_price,
            acceptsItems: offerDetails.accepts_items === 1,
            notes: offerDetails.notes
          },
          {
            id: offerId,
            listingId: offerDetails.listing_id,
            coinOffer: offerDetails.coin_offer,
            message: offerDetails.message,
            buyerName: offerDetails.username
          }
        );
      }
    } catch (notificationError) {
      console.error('Failed to send Discord notification for offer rejection:', notificationError);
    }

    res.json({ message: 'Offer rejected successfully' });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
});

// Get user's own listings
router.get('/my-listings', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any).id;
    const db = await getDatabase();
    
    const listings = await db.all(`
      SELECT 
        l.*,
        u.username as seller_name,
        u.discord_id as seller_discord_id,
        u.discriminator as seller_discriminator,
        u.avatar as seller_avatar,
        u.created_at as seller_joined_date,
        (SELECT COUNT(*) FROM marketplace_offers o WHERE o.listing_id = l.id AND o.status = 'pending') as offer_count
      FROM marketplace_listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.user_id = ? AND l.status = 'active'
      ORDER BY l.created_at DESC
    `, [userId]);
    
    res.json(listings);
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(500).json({ error: 'Failed to fetch user listings' });
  }
});

// Get user's offers
router.get('/my-offers', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any).id;
    const db = await getDatabase();
    
    const offers = await db.all(`
      SELECT 
        o.*,
        l.item_id,
        l.quantity as listing_quantity,
        l.asking_price,
        u.username as seller_name
      FROM marketplace_offers o
      JOIN marketplace_listings l ON o.listing_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    // Get offer items for each offer
    for (const offer of offers) {
      const offerItems = await db.all(`
        SELECT * FROM marketplace_offer_items 
        WHERE offer_id = ?
      `, [offer.id]);
      offer.item_offers = offerItems;
    }
    
    res.json(offers);
  } catch (error) {
    console.error('Error fetching user offers:', error);
    res.status(500).json({ error: 'Failed to fetch user offers' });
  }
});

// Get seller profile information
router.get('/seller/:discordId', async (req: Request, res: Response): Promise<void> => {
  try {
    const discordId = req.params.discordId;
    const db = await getDatabase();
    
    // Get seller basic info
    const seller = await db.get(`
      SELECT 
        id,
        discord_id,
        username,
        discriminator,
        avatar,
        created_at as joined_date
      FROM users 
      WHERE discord_id = ?
    `, [discordId]);

    if (!seller) {
      res.status(404).json({ error: 'Seller not found' });
      return;
    }

    // Get seller statistics
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_listings,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as total_sales,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_listings
      FROM marketplace_listings 
      WHERE user_id = ?
    `, [seller.id]);

    // Get seller's active listings
    const listings = await db.all(`
      SELECT 
        l.*
      FROM marketplace_listings l
      WHERE l.user_id = ? AND l.status = 'active'
      ORDER BY l.created_at DESC
      LIMIT 10
    `, [seller.id]);

    // Get recent completed trades (sold listings)
    const recentTrades = await db.all(`
      SELECT 
        l.item_id,
        l.quantity,
        l.asking_price,
        l.updated_at as sold_date
      FROM marketplace_listings l
      WHERE l.user_id = ? AND l.status = 'sold'
      ORDER BY l.updated_at DESC
      LIMIT 5
    `, [seller.id]);

    const profile = {
      ...seller,
      stats: {
        total_listings: stats.total_listings || 0,
        total_sales: stats.total_sales || 0,
        active_listings: stats.active_listings || 0,
        success_rate: stats.total_listings > 0 ? Math.round((stats.total_sales / stats.total_listings) * 100) : 0
      },
      listings,
      recent_trades: recentTrades
    };

    res.json(profile);
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    res.status(500).json({ error: 'Failed to fetch seller profile' });
  }
});

export default router;
