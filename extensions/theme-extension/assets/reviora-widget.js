(() => {
  class RevioraReviewsWidget extends HTMLElement {
    constructor() {
      super();
      this.shop = this.getAttribute("data-shop") || window.Shopify?.shop || window.location.hostname;
      this.productId = this.getAttribute("data-product-id") || "";
      this.productTitle = this.getAttribute("data-product-title") || "";
      this.starColor = this.getAttribute("data-star-color") || "#FFB800";
      this.apiUrl = (this.getAttribute("data-api-url") || "").trim().replace(/\/+$/, "");
      this.selectedRating = 5;
      this.modalEl = null;
      this.currentStep = 1;
      this.uploadedMedia = []; // [{ type: "PHOTO"|"VIDEO", url: string, name: string }]
      this.photoUploadsEnabled = true; // default true, updated by API response
    }

    connectedCallback() {
      const attrColor = this.getAttribute("data-star-color");
      if (attrColor && attrColor.trim() && attrColor !== "undefined") {
        this.starColor = attrColor.trim();
      } else {
        this.starColor = "#FFB800";
      }
      this.renderLoading();
      this.fetchReviews();
    }

    disconnectedCallback() {
      if (this.modalEl && this.modalEl.parentNode) {
        this.modalEl.parentNode.removeChild(this.modalEl);
        this.modalEl = null;
      }
      document.body.classList.remove("reviora-modal-open");
    }

    renderLoading() {
      this.innerHTML = `
        <div class="reviora-widget-container">
          <p class="reviora-loading-text">Loading verified customer reviews...</p>
        </div>
      `;
    }

    async fetchReviews() {
      const shopParam = encodeURIComponent(this.shop || "");
      const productParam = encodeURIComponent(this.productId || "");

      if (!this.productId) {
        this.render({
          reviews: [],
          stats: { total: 0, averageRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, photoUploadsEnabled: true },
        });
        return;
      }

      const base = this.apiUrl || "";
      const endpoint = `${base}/api/reviews?shop=${shopParam}&productId=${productParam}`;

      try {
        const res = await fetch(endpoint, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        this.photoUploadsEnabled = data.stats?.photoUploadsEnabled !== false;
        this.render(data);
      } catch (e) {
        console.warn("Reviora widget API unreachable, rendering interface fallback:", endpoint, e);
        this.render({
          reviews: [],
          stats: { total: 0, averageRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, photoUploadsEnabled: true },
          isOffline: true,
        });
      }
    }

    renderStars(rating) {
      const rounded = Math.round(rating);
      let stars = "";
      for (let i = 1; i <= 5; i++) {
        stars += `<span style="color:${i <= rounded ? this.starColor : '#E5E7EB'}">★</span>`;
      }
      return stars;
    }

    getRatingLabel(rating) {
      switch (rating) {
        case 5:
          return "5 Stars — Loved it! Outstanding";
        case 4:
          return "4 Stars — Very Good";
        case 3:
          return "3 Stars — Average / It's OK";
        case 2:
          return "2 Stars — Not great / Disappointed";
        case 1:
          return "1 Star — Terrible experience";
        default:
          return `${rating} Stars`;
      }
    }

    renderMediaItem(m) {
      const isVideo = m.mediaType === "VIDEO" || (m.url && /\.(mp4|webm|mov|ogg)($|\?)/i.test(m.url));
      if (isVideo) {
        return `<video src="${m.url}" class="reviora-media-img" controls playsinline preload="metadata"></video>`;
      }
      return `<a href="${m.url}" target="_blank" rel="noopener noreferrer" class="reviora-media-link" aria-label="Open review photo in new window"><img src="${m.url}" class="reviora-media-img" alt="Review photo" loading="lazy"></a>`;
    }

    renderReviewCard(r) {
      const mediaHtml = (r.media || []).map((m) => this.renderMediaItem(m)).join("");
      const replyHtml = r.replies && r.replies.length > 0
        ? `<div class="reviora-reply-box"><strong>${r.replies[0].author || "Store Owner"}</strong><p>${r.replies[0].body}</p></div>`
        : "";

      return `
        <div class="reviora-card">
          <div class="reviora-card-top">
            <div>
              <span class="reviora-stars">${this.renderStars(r.rating)}</span>
              <span class="reviora-author">${r.authorName}</span>
              ${r.verified ? '<span class="reviora-badge">✓ Verified Buyer</span>' : ""}
            </div>
            <div class="reviora-date">${new Date(r.createdAt).toLocaleDateString()}</div>
          </div>
          ${r.title ? `<div class="reviora-card-title">${r.title}</div>` : ""}
          <div class="reviora-card-body">${r.body}</div>
          ${mediaHtml ? `<div class="reviora-media-row">${mediaHtml}</div>` : ""}
          ${replyHtml}
          <div>
            <button type="button" class="reviora-helpful-btn" data-review-id="${r.id}">
              👍 Helpful (${r.helpfulCount || 0})
            </button>
          </div>
        </div>
      `;
    }

    render(data) {
      const stats = data.stats || { total: 0, averageRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
      const reviews = data.reviews || [];

      const dist = stats.distribution || {};
      const totalCount = Number(stats.total) || 0;
      const fillColor = this.starColor || "#FFB800";

      const barsHtml = [5, 4, 3, 2, 1]
        .map((r) => {
          const count = Number(dist[r] || dist[String(r)] || 0);
          const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
          return `
            <div class="reviora-bar-row">
              <span>${r}★</span>
              <div class="reviora-bar-track">
                <div class="reviora-bar-fill" style="width: ${pct}% !important; background-color: ${fillColor} !important;"></div>
              </div>
              <span class="reviora-bar-count">${count}</span>
            </div>
          `;
        })
        .join("");

      let reviewsListHtml = "";
      if (reviews.length === 0) {
        reviewsListHtml = `
          <div class="reviora-empty-state">
            <p class="reviora-empty-title">Be the first to review this product!</p>
            <p class="reviora-empty-sub">Share your honest thoughts and help other shoppers make the best choice.</p>
          </div>
        `;
      } else {
        reviewsListHtml = reviews.map((r) => this.renderReviewCard(r)).join("");
      }

      this.innerHTML = `
        <div class="reviora-widget-container">
          <div class="reviora-header">
            <h2 class="reviora-title">Customer Reviews</h2>
            <div class="reviora-summary-grid">
              <div class="reviora-avg-box">
                <div class="reviora-avg-number">${stats.averageRating.toFixed(1)}</div>
                <div class="reviora-stars">${this.renderStars(stats.averageRating)}</div>
                <div class="reviora-subtext">Based on ${stats.total} reviews</div>
              </div>
              <div class="reviora-bars">${barsHtml}</div>
              <div>
                <button type="button" class="reviora-write-btn" id="reviora-open-form-btn">
                  Write a Review
                </button>
              </div>
            </div>
          </div>

          <div class="reviora-list">${reviewsListHtml}</div>
        </div>
      `;

      this.createGlobalModal();
      this.attachEventListeners();
    }

    createGlobalModal() {
      if (this.modalEl && this.modalEl.parentNode) {
        this.modalEl.parentNode.removeChild(this.modalEl);
      }

      const modalDiv = document.createElement("div");
      modalDiv.id = "reviora-modal";
      modalDiv.className = "reviora-modal-backdrop is-hidden";
      modalDiv.style.display = "none";
      modalDiv.setAttribute("role", "dialog");
      modalDiv.setAttribute("aria-modal", "true");

      modalDiv.innerHTML = `
        <div class="reviora-modal">
          <div class="reviora-modal-header">
            <div class="reviora-modal-title-group">
              <h3>Write a Review</h3>
              <p class="reviora-modal-subtitle">${this.productTitle ? 'for ' + this.productTitle : 'Share your experience with the community'}</p>
            </div>
            <button type="button" id="reviora-close-form-btn" class="reviora-close-btn" aria-label="Close modal">&times;</button>
          </div>

          <div class="reviora-modal-body">
            <!-- Step Indicator -->
            <div class="reviora-step-indicator">
              <div class="reviora-step-pill is-active" id="reviora-step-pill-1">
                <span class="reviora-step-circle">1</span> Rating &amp; Review
              </div>
              <span class="reviora-step-arrow">→</span>
              <div class="reviora-step-pill" id="reviora-step-pill-2">
                <span class="reviora-step-circle">2</span> Photos &amp; Video
              </div>
            </div>

            <form id="reviora-submit-form">
              <!-- STEP 1: REVIEW DETAILS -->
              <div id="reviora-step-1" class="reviora-step-panel">
                <!-- Interactive Star Picker -->
                <div class="reviora-star-picker-wrapper">
                  <span class="reviora-star-picker-label">Overall Rating</span>
                  <div class="reviora-interactive-stars" id="reviora-interactive-stars">
                    <button type="button" class="reviora-star-btn" data-value="1" style="color: ${this.starColor};">★</button>
                    <button type="button" class="reviora-star-btn" data-value="2" style="color: ${this.starColor};">★</button>
                    <button type="button" class="reviora-star-btn" data-value="3" style="color: ${this.starColor};">★</button>
                    <button type="button" class="reviora-star-btn" data-value="4" style="color: ${this.starColor};">★</button>
                    <button type="button" class="reviora-star-btn" data-value="5" style="color: ${this.starColor};">★</button>
                  </div>
                  <span class="reviora-star-text-badge" id="reviora-star-text-badge">${this.getRatingLabel(5)}</span>
                  <input type="hidden" id="reviora-form-rating" value="5" />
                </div>

                <!-- Review Headline -->
                <div class="reviora-form-field">
                  <label class="reviora-form-label" for="reviora-form-title">Review Headline *</label>
                  <input
                    type="text"
                    id="reviora-form-title"
                    class="reviora-input"
                    placeholder="e.g. Exceeded my expectations!"
                    required
                  />
                </div>

                <!-- Review Comments -->
                <div class="reviora-form-field">
                  <label class="reviora-form-label" for="reviora-form-body">Review Comments *</label>
                  <textarea
                    id="reviora-form-body"
                    class="reviora-textarea"
                    rows="3"
                    placeholder="What did you like or dislike? How was the fit and quality?"
                    required
                  ></textarea>
                </div>

                <!-- Author Details -->
                <div class="reviora-form-row">
                  <div class="reviora-form-field">
                    <label class="reviora-form-label" for="reviora-form-name">Your Public Name *</label>
                    <input
                      type="text"
                      id="reviora-form-name"
                      class="reviora-input"
                      placeholder="e.g. Alex M."
                      required
                    />
                  </div>
                  <div class="reviora-form-field">
                    <label class="reviora-form-label" for="reviora-form-email">Your Email *</label>
                    <input
                      type="email"
                      id="reviora-form-email"
                      class="reviora-input"
                      placeholder="alex@example.com"
                      required
                    />
                  </div>
                </div>

                <!-- Step 1 Controls -->
                <div class="reviora-submit-row">
                  <button type="button" class="reviora-cancel-btn" id="reviora-cancel-form-btn">
                    Cancel
                  </button>
                  <button type="button" class="reviora-write-btn reviora-full-width" id="reviora-goto-step-2-btn">
                    Continue to Photos →
                  </button>
                </div>
              </div>

              <!-- STEP 2: MEDIA UPLOADS (IF SUPPORTED) -->
              <div id="reviora-step-2" class="reviora-step-panel" style="display: none;">
                <div id="reviora-media-unsupported" style="display: none;">
                  <div class="reviora-plan-locked-box">
                    <span class="reviora-plan-locked-badge">Plan Notice</span>
                    <h4 class="reviora-plan-locked-title">Text Reviews Enabled</h4>
                    <p class="reviora-plan-locked-desc">
                      Photo &amp; video uploads are an exclusive feature of the Growth plan. Your written review will be submitted directly!
                    </p>
                  </div>
                </div>

                <div id="reviora-media-supported">
                  <label class="reviora-form-label" id="reviora-media-label">Add Photos or Video (Optional)</label>
                  <input type="file" id="reviora-file-input" accept="image/*,video/*" multiple style="display:none;" />
                  <button type="button" class="reviora-dropzone" id="reviora-dropzone" aria-labelledby="reviora-media-label">
                    <span class="reviora-dropzone-icon">📷</span>
                    <span class="reviora-dropzone-text">Click or drag images/videos here</span>
                    <span class="reviora-dropzone-sub">Supported formats: JPG, PNG, WEBP, MP4 (up to 3 files)</span>
                  </button>

                  <!-- Uploaded Thumbnails Preview Grid -->
                  <div class="reviora-preview-grid" id="reviora-preview-grid"></div>
                </div>

                <!-- Step 2 Controls -->
                <div class="reviora-submit-row">
                  <button type="button" class="reviora-cancel-btn" id="reviora-back-to-step-1-btn">
                    ← Back
                  </button>
                  <button type="submit" class="reviora-write-btn reviora-full-width" id="reviora-final-submit-btn">
                    Submit Review
                  </button>
                </div>
              </div>
            </form>

            <!-- STEP 3: SUCCESS CELEBRATION VIEW -->
            <div id="reviora-step-success" class="reviora-success-view" style="display:none;">
              <div class="reviora-success-icon-wrap">
                <div class="reviora-success-ring">
                  <svg class="reviora-checkmark-svg" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <h3 class="reviora-success-title">Review Submitted!</h3>
              <p class="reviora-success-sub">Thank you for sharing your experience. Your feedback helps our community thrive.</p>
              <div class="reviora-success-badge-row">
                <span>✨ Verified Feedback</span>
              </div>
              <div>
                <button type="button" class="reviora-write-btn reviora-full-width" id="reviora-success-done-btn">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modalDiv);
      this.modalEl = modalDiv;
    }

    attachEventListeners() {
      const modal = this.modalEl;
      const openBtn = this.querySelector("#reviora-open-form-btn");
      if (!modal) return;

      const closeBtn = modal.querySelector("#reviora-close-form-btn");
      const cancelBtn = modal.querySelector("#reviora-cancel-form-btn");
      const gotoStep2Btn = modal.querySelector("#reviora-goto-step-2-btn");
      const backToStep1Btn = modal.querySelector("#reviora-back-to-step-1-btn");
      const step1Panel = modal.querySelector("#reviora-step-1");
      const step2Panel = modal.querySelector("#reviora-step-2");
      const stepPill1 = modal.querySelector("#reviora-step-pill-1");
      const stepPill2 = modal.querySelector("#reviora-step-pill-2");
      const form = modal.querySelector("#reviora-submit-form");
      const starRatingInput = modal.querySelector("#reviora-form-rating");
      const starTextBadge = modal.querySelector("#reviora-star-text-badge");
      const starButtons = modal.querySelectorAll(".reviora-star-btn");
      const fileInput = modal.querySelector("#reviora-file-input");
      const dropzone = modal.querySelector("#reviora-dropzone");
      const previewGrid = modal.querySelector("#reviora-preview-grid");
      const mediaSupportedBox = modal.querySelector("#reviora-media-supported");
      const mediaUnsupportedBox = modal.querySelector("#reviora-media-unsupported");

      const successPanel = modal.querySelector("#reviora-step-success");
      const stepIndicator = modal.querySelector(".reviora-step-indicator");
      const doneBtn = modal.querySelector("#reviora-success-done-btn");

      this.uploadedMedia = [];

      const setStep = (step) => {
        this.currentStep = step;
        if (step === 1) {
          form.style.display = "block";
          if (stepIndicator) stepIndicator.style.display = "flex";
          step1Panel.style.display = "block";
          step2Panel.style.display = "none";
          if (successPanel) successPanel.style.display = "none";
          stepPill1.className = "reviora-step-pill is-active";
          stepPill2.className = "reviora-step-pill";
        } else if (step === 2) {
          form.style.display = "block";
          if (stepIndicator) stepIndicator.style.display = "flex";
          step1Panel.style.display = "none";
          step2Panel.style.display = "block";
          if (successPanel) successPanel.style.display = "none";
          stepPill1.className = "reviora-step-pill is-done";
          stepPill2.className = "reviora-step-pill is-active";

          // Check if plan supports media
          if (this.photoUploadsEnabled) {
            mediaSupportedBox.style.display = "block";
            mediaUnsupportedBox.style.display = "none";
          } else {
            mediaSupportedBox.style.display = "none";
            mediaUnsupportedBox.style.display = "block";
          }
        } else if (step === 3) {
          // Success celebration step
          form.style.display = "none";
          if (stepIndicator) stepIndicator.style.display = "none";
          if (successPanel) successPanel.style.display = "block";
        }
      };

      if (doneBtn) {
        doneBtn.onclick = () => {
          closeModal();
          form.reset();
          this.uploadedMedia = [];
          setStep(1);
        };
      }

      const updateStarDisplay = (val) => {
        starButtons.forEach((btn) => {
          const btnVal = Number(btn.getAttribute("data-value"));
          btn.style.color = btnVal <= val ? this.starColor : "#D1D5DB";
        });
        if (starTextBadge) {
          starTextBadge.innerText = this.getRatingLabel(val);
        }
      };

      starButtons.forEach((btn) => {
        btn.onclick = () => {
          const val = Number(btn.getAttribute("data-value"));
          this.selectedRating = val;
          if (starRatingInput) starRatingInput.value = val;
          updateStarDisplay(val);
        };
        btn.onmouseenter = () => {
          const val = Number(btn.getAttribute("data-value"));
          updateStarDisplay(val);
        };
        btn.onmouseleave = () => {
          updateStarDisplay(this.selectedRating);
        };
      });

      const closeModal = (e) => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
          e.stopPropagation();
        }
        modal.classList.remove("is-active");
        modal.classList.add("is-hidden");
        modal.style.setProperty("display", "none", "important");
        document.body.classList.remove("reviora-modal-open");
      };

      const openModal = (e) => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
          e.stopPropagation();
        }
        modal.classList.remove("is-hidden");
        modal.classList.add("is-active");
        modal.style.setProperty("display", "flex", "important");
        document.body.classList.add("reviora-modal-open");
        this.selectedRating = 5;
        if (starRatingInput) starRatingInput.value = "5";
        updateStarDisplay(5);
        this.uploadedMedia = [];
        renderPreviews();
        setStep(1);
      };

      if (openBtn) openBtn.addEventListener("click", openModal);
      if (closeBtn) closeBtn.addEventListener("click", closeModal);
      if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

      // Helper to highlight a field with red border and inline error message
      const showFieldError = (field, message) => {
        if (!field) return;
        field.classList.add("reviora-input-error");
        let errEl = field.parentNode.querySelector(".reviora-error-msg");
        if (!errEl) {
          errEl = document.createElement("span");
          errEl.className = "reviora-error-msg";
          field.parentNode.appendChild(errEl);
        }
        errEl.innerText = message;
      };

      const clearFieldError = (field) => {
        if (!field) return;
        field.classList.remove("reviora-input-error");
        const errEl = field.parentNode.querySelector(".reviora-error-msg");
        if (errEl) {
          errEl.remove();
        }
      };

      const titleInput = modal.querySelector("#reviora-form-title");
      const bodyInput = modal.querySelector("#reviora-form-body");
      const nameInput = modal.querySelector("#reviora-form-name");
      const emailInput = modal.querySelector("#reviora-form-email");

      [titleInput, bodyInput, nameInput, emailInput].forEach((input) => {
        if (input) {
          input.addEventListener("input", () => clearFieldError(input));
        }
      });

      // Validate Step 1 with red border highlights before proceeding to Step 2
      if (gotoStep2Btn) {
        gotoStep2Btn.onclick = () => {
          let hasError = false;

          const titleVal = (titleInput?.value || "").trim();
          const bodyVal = (bodyInput?.value || "").trim();
          const nameVal = (nameInput?.value || "").trim();
          const emailVal = (emailInput?.value || "").trim();

          if (!titleVal) {
            showFieldError(titleInput, "Please enter a headline for your review.");
            hasError = true;
          } else {
            clearFieldError(titleInput);
          }

          if (!bodyVal) {
            showFieldError(bodyInput, "Please write your review feedback.");
            hasError = true;
          } else {
            clearFieldError(bodyInput);
          }

          if (!nameVal) {
            showFieldError(nameInput, "Please enter your name.");
            hasError = true;
          } else {
            clearFieldError(nameInput);
          }

          if (!emailVal) {
            showFieldError(emailInput, "Please enter your email.");
            hasError = true;
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            showFieldError(emailInput, "Please enter a valid email address.");
            hasError = true;
          } else {
            clearFieldError(emailInput);
          }

          if (hasError) {
            // Smoothly focus first erroneous field
            const firstErr = modal.querySelector(".reviora-input-error");
            if (firstErr) firstErr.focus();
            return;
          }

          setStep(2);
        };
      }

      if (backToStep1Btn) {
        backToStep1Btn.onclick = () => {
          setStep(1);
        };
      }

      // Handle Dropzone & File Input
      if (dropzone && fileInput) {
        dropzone.onclick = () => fileInput.click();
        dropzone.onkeydown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInput.click();
          }
        };

        dropzone.ondragover = (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "#008060";
        };
        dropzone.ondragleave = () => {
          dropzone.style.borderColor = "#cbd5e1";
        };
        dropzone.ondrop = (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "#cbd5e1";
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        };

        fileInput.onchange = () => {
          if (fileInput.files) handleFiles(fileInput.files);
        };
      }

      const handleFiles = (files) => {
        if (!this.photoUploadsEnabled) return;
        Array.from(files).forEach((file) => {
          if (this.uploadedMedia.length >= 3) {
            showModalNotice("Maximum 3 files allowed per review.", true);
            return;
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            const isVideo = file.type.startsWith("video/");
            this.uploadedMedia.push({
              type: isVideo ? "VIDEO" : "PHOTO",
              url: e.target.result,
              name: file.name,
            });
            renderPreviews();
          };
          reader.readAsDataURL(file);
        });
      };

      const renderPreviews = () => {
        if (!previewGrid) return;
        previewGrid.innerHTML = this.uploadedMedia
          .map((m, idx) => {
            const mediaTag =
              m.type === "VIDEO"
                ? `<video src="${m.url}"></video>`
                : `<img src="${m.url}" alt="Preview" />`;
            return `
              <div class="reviora-preview-thumb">
                ${mediaTag}
                <button type="button" class="reviora-remove-thumb" data-idx="${idx}">&times;</button>
              </div>
            `;
          })
          .join("");

        previewGrid.querySelectorAll(".reviora-remove-thumb").forEach((btn) => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const idx = Number(btn.getAttribute("data-idx"));
            this.uploadedMedia.splice(idx, 1);
            renderPreviews();
          };
        });
      };

      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeModal(e);
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal && modal.style.display !== "none") {
          closeModal(e);
        }
      });

      const showModalNotice = (msg, isError = true) => {
        let banner = modal.querySelector(".reviora-toast-banner");
        if (!banner) {
          banner = document.createElement("div");
          banner.className = "reviora-toast-banner";
          const bodyEl = modal.querySelector(".reviora-modal-body");
          bodyEl.insertBefore(banner, bodyEl.firstChild);
        }
        banner.style.background = isError ? "#fef2f2" : "#f0fdf4";
        banner.style.borderColor = isError ? "#fecaca" : "#bbf7d0";
        banner.style.color = isError ? "#991b1b" : "#166534";
        banner.innerText = msg;
        setTimeout(() => {
          if (banner && banner.parentNode) banner.remove();
        }, 5000);
      };

      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const submitBtn = modal.querySelector("#reviora-final-submit-btn");
          submitBtn.disabled = true;
          submitBtn.innerText = "Submitting Review...";

          const payload = {
            shop: this.shop,
            productId: this.productId,
            productTitle: this.productTitle,
            rating: Number(starRatingInput.value || 5),
            title: modal.querySelector("#reviora-form-title").value,
            body: modal.querySelector("#reviora-form-body").value,
            authorName: modal.querySelector("#reviora-form-name").value,
            authorEmail: modal.querySelector("#reviora-form-email").value,
            mediaUrls: this.photoUploadsEnabled ? this.uploadedMedia : [],
          };

          const base = this.apiUrl || "";
          try {
            const res = await fetch(`${base}/api/reviews`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              setStep(3);
              this.fetchReviews();
              setTimeout(() => {
                closeModal();
                form.reset();
                this.uploadedMedia = [];
                setStep(1);
              }, 4000);
            } else {
              const err = await res.json().catch(() => ({}));
              showModalNotice(err.error || "Could not submit review. Please try again.");
            }
          } catch {
            showModalNotice("Network error submitting review. Please try again.");
          } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Review";
          }
        };
      }

      this.querySelectorAll(".reviora-helpful-btn").forEach((btn) => {
        btn.onclick = async () => {
          const reviewId = btn.getAttribute("data-review-id");
          if (!reviewId) return;

          btn.disabled = true;
          const base = this.apiUrl || "";
          try {
            const res = await fetch(`${base}/api/reviews/${reviewId}/vote`, { method: "POST" });
            const result = await res.json();
            if (result.success) {
              btn.innerText = `👍 Helpful (${result.helpfulCount})`;
            }
          } catch (e) {
            console.error("Helpful vote failed:", e);
          }
        };
      });
    }
  }

  if (!customElements.get("reviora-reviews-widget")) {
    customElements.define("reviora-reviews-widget", RevioraReviewsWidget);
  }
})();
