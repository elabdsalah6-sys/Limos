import { useState, useEffect } from "react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Reviews.css";

const STARS = [1, 2, 3, 4, 5];

/* ── Star renderer ── */
const Stars = ({ value, interactive = false, onChange }) => (
  <div className="stars">
    {STARS.map((s) => (
      <button
        key={s}
        type="button"
        className={`star ${s <= value ? "star--on" : ""} ${interactive ? "star--interactive" : ""}`}
        onClick={() => interactive && onChange && onChange(s)}
        disabled={!interactive}
      >
        ★
      </button>
    ))}
  </div>
);

/* ── Single review card ── */
const ReviewCard = ({ review, currentUserId, isAdmin, onDelete, onEdit }) => {
  const isOwner = currentUserId === review.user;
  const date = new Date(review.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="review-card">
      <div className="review-card-header">
        <div className="review-card-avatar">
          {review.userName?.charAt(0).toUpperCase()}
        </div>
        <div className="review-card-meta">
          <span className="review-card-name">{review.userName}</span>
          <span className="review-card-date">{date}</span>
        </div>
        <Stars value={review.rating} />
      </div>
      <p className="review-card-comment">{review.comment}</p>
      {(isOwner || isAdmin) && (
        <div className="review-card-actions">
          {isOwner && (
            <button
              className="review-action-btn"
              onClick={() => onEdit(review)}
            >
              Edit
            </button>
          )}
          <button
            className="review-action-btn review-action-btn--delete"
            onClick={() => onDelete(review._id)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const Reviews = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "it";

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // edit state
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* ── fetch ── */
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/reviews");
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  /* ── derived ── */
  const userHasReview = user ? reviews.some((r) => r.user === user._id) : false;

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : null;

  /* ── submit new review ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return setFormError("Please write a comment.");
    setFormError("");
    setSubmitting(true);
    try {
      const { data } = await API.post("/reviews", { rating, comment });
      setReviews((prev) => [data, ...prev]);
      setComment("");
      setRating(5);
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── open edit modal ── */
  const openEdit = (review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  /* ── save edit ── */
  const handleEditSave = async () => {
    if (!editComment.trim()) return;
    setEditSubmitting(true);
    try {
      const { data } = await API.put(`/reviews/${editingReview._id}`, {
        rating: editRating,
        comment: editComment,
      });
      setReviews((prev) => prev.map((r) => (r._id === data._id ? data : r)));
      setEditingReview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setEditSubmitting(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async () => {
    try {
      await API.delete(`/reviews/${deleteTarget}`);
      setReviews((prev) => prev.filter((r) => r._id !== deleteTarget));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteTarget(null);
    }
  };

  /* ══════════ RENDER ══════════ */
  return (
    <div className="reviews">
      {/* ── Header ── */}
      <div className="reviews-header">
        <div>
          <h2 className="reviews-title">Customer Reviews</h2>
          {avgRating && (
            <div className="reviews-avg">
              <span className="reviews-avg-score">{avgRating}</span>
              <Stars value={Math.round(avgRating)} />
              <span className="reviews-avg-count">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Write a review form ── */}
      {user && !userHasReview && (
        <div className="review-form-wrap">
          <h3 className="review-form-title">Leave a Review</h3>
          <form onSubmit={handleSubmit} className="review-form">
            <div className="review-form-row">
              <span className="review-form-label">Your rating</span>
              <Stars value={rating} interactive onChange={setRating} />
            </div>
            <textarea
              className="review-textarea"
              rows={3}
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {formError && <p className="review-form-error">{formError}</p>}
            <button
              type="submit"
              className="review-submit-btn"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      )}

      {!user && (
        <p className="review-login-prompt">
          <a href="/login">Log in</a> to leave a review.
        </p>
      )}

      {userHasReview && (
        <p className="review-already">
          You've already left a review. Edit or delete it below.
        </p>
      )}

      {/* ── Reviews list ── */}
      {loading ? (
        <div className="reviews-loading">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="reviews-empty">
          <p>No reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((r) => (
            <ReviewCard
              key={r._id}
              review={r}
              currentUserId={user?._id}
              isAdmin={isAdmin}
              onDelete={(id) => setDeleteTarget(id)}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingReview && (
        <div className="modal-overlay" onClick={() => setEditingReview(null)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Edit Review</h2>
              <button
                className="modal-close"
                onClick={() => setEditingReview(null)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <div className="review-form-row" style={{ marginBottom: 12 }}>
                <span className="review-form-label">Rating</span>
                <Stars
                  value={editRating}
                  interactive
                  onChange={setEditRating}
                />
              </div>
              <textarea
                className="review-textarea"
                rows={3}
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn-ghost"
                onClick={() => setEditingReview(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleEditSave}
                disabled={editSubmitting}
              >
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete review?</h2>
              <button
                className="modal-close"
                onClick={() => setDeleteTarget(null)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  color: "#9a8878",
                  fontSize: 14,
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
