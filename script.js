const GEMINI_API_KEY = "AIzaSyBrMzN67NiIiqVElPxwGzuZWdUqEcJKup4";
const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const ALLOWED_KEYWORDS = [
  "resource", "community", "service", "help", "assistance", "support",
  "social", "shelter", "housing", "food", "bank", "pantry", "healthcare",
  "medical", "mental", "health", "therapy", "counseling", "education",
  "training", "employment", "job", "legal", "aid", "city", "county",
  "center", "organization", "nonprofit", "program", "senior", "youth",
  "children", "family", "clinic", "emergency", "crisis", "hotline", "near",
  "in", "location", "address", "hours", "eligibility", "cost", "free"
];

let messages = [];
let history = [];
let darkMode = localStorage.getItem("darkMode") === "true";

document.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const newChatBtn = document.getElementById("new-chat");
  const clearHistoryBtn = document.getElementById("clear-history");
  const historyDiv = document.getElementById("history");
  const emptyState = document.getElementById("empty-state");
  const themeToggle = document.getElementById("theme-toggle");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const exportChatBtn = document.getElementById("export-chat");
  const compareBtn = document.getElementById("compare-resources");
  const compareModal = document.getElementById("compare-modal");
  const compareModalClose = document.getElementById("compare-modal-close");
  const compareCancel = document.getElementById("compare-cancel");
  const compareSubmit = document.getElementById("compare-submit");
  const productA = document.getElementById("product-a");
  const productB = document.getElementById("product-b");
  const resourceModal = document.getElementById("resource-modal");
  const resourceModalClose = document.getElementById("resource-modal-close");
  const resourceDirections = document.getElementById("resource-directions");
  const resourceContact = document.getElementById("resource-contact");

  loadHistory();

  compareBtn.addEventListener("click", () => {
    compareModal.classList.add("active");
    setTimeout(() => productA.focus(), 100);
  });

  compareModalClose.addEventListener("click", () => {
    compareModal.classList.remove("active");
  });

  compareCancel.addEventListener("click", () => {
    compareModal.classList.remove("active");
  });

  compareModal.addEventListener("click", (e) => {
    if (e.target === compareModal) {
      compareModal.classList.remove("active");
    }
  });

  resourceModalClose.addEventListener("click", () => {
    resourceModal.classList.remove("active");
  });

  resourceModal.addEventListener("click", (e) => {
    if (e.target === resourceModal) {
      resourceModal.classList.remove("active");
    }
  });

  // Compare submit handler
  compareSubmit.addEventListener("click", () => {
    const firstResource = productA.value.trim();
    const secondResource = productB.value.trim();

    if (!firstResource || !secondResource) {
      showToast("Please enter both resource names", "error");
      return;
    }

    compareModal.classList.remove("active");
    compareResources(firstResource, secondResource);

    productA.value = "";
    productB.value = "";
  });

  if (darkMode) {
    document.body.classList.add("dark-theme");
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("query");
  if (query) {
    hideEmptyState();
    addMessage("user", query);
    getResourceResponse(query);
  }

  sendBtn.addEventListener("click", () => sendMessage());
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  newChatBtn.addEventListener("click", () => {
    messages = [];
    chatMessages.innerHTML = "";
    showEmptyState();

    if (window.innerWidth <= 768) {
      sidebar.classList.remove("active");
    }

    showToast("New search started", "info");
  });

  clearHistoryBtn.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to clear all search history? This cannot be undone."
      )
    ) {
      history = [];
      localStorage.setItem("resourceFinder_history", JSON.stringify(history));
      renderHistory();
      showToast("History cleared", "success");
    }
  });

  historyDiv.addEventListener("click", (e) => {
    const item = e.target.closest(".history-item");
    if (item) {
      const index = item.dataset.index;
      messages = [...history[index].messages];
      renderMessages();

      if (window.innerWidth <= 768) {
        sidebar.classList.remove("active");
      }
    }
  });

  themeToggle.addEventListener("click", () => {
    darkMode = !darkMode;
    localStorage.setItem("darkMode", darkMode);
    document.body.classList.toggle("dark-theme");
    themeToggle.innerHTML = darkMode
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  });

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  exportChatBtn.addEventListener("click", () => {
    exportChat();
  });

  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 768 &&
      !sidebar.contains(e.target) &&
      !sidebarToggle.contains(e.target) &&
      sidebar.classList.contains("active")
    ) {
      sidebar.classList.remove("active");
    }
  });

  if (messages.length === 0) {
    showEmptyState();
  }

  // Resource click handler
  chatMessages.addEventListener("click", (e) => {
    const resourceElement = e.target.closest(".resource-in-results");
    if (resourceElement) {
      const resourceName = resourceElement.textContent.trim();
      const organizationSection = resourceElement.closest(".organization-section");
      const organizationName = organizationSection ?
        organizationSection.querySelector(".organization-name")?.textContent : "";
      showResourceDetails(resourceName, organizationName);
    }
  });

  // Direction button handler
  resourceDirections.addEventListener("click", () => {
    const resourceName = document.getElementById("resource-title").textContent;
    const address = document.getElementById("resource-address")?.textContent || "";

    if (address) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(mapsUrl, '_blank');
    } else {
      showToast(`Could not find address for ${resourceName}`, "error");
    }

    resourceModal.classList.remove("active");
  });

  // Contact button handler
  resourceContact.addEventListener("click", () => {
    const resourceName = document.getElementById("resource-title").textContent;
    const phone = document.getElementById("resource-phone")?.dataset?.phone;

    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      showToast(`Could not find contact information for ${resourceName}`, "error");
    }

    resourceModal.classList.remove("active");
  });
});

// Attach click listeners for resources after rendering
function attachResourceClickListeners() {
  document.querySelectorAll('.resource-in-results').forEach(resourceElement => {
    if (!resourceElement.hasAttribute('listener')) {
      resourceElement.setAttribute('listener', 'true');
      resourceElement.addEventListener('click', function() {
        const resourceName = this.textContent.trim();
        const organizationSection = this.closest('.organization-section');
        const organizationName = organizationSection ?
          organizationSection.querySelector('.organization-name')?.textContent : '';
        showResourceDetails(resourceName, organizationName);
      });
    }
  });
}

function addMessage(role, content, timestamp = new Date()) {
  hideEmptyState();
  const formattedContent = role === "assistant" ? formatResponse(content) : content;
  messages.push({ role, content: formattedContent, timestamp });
  renderMessages();

  // Attach click listeners to newly added resource items
  if (role === "assistant") {
    setTimeout(() => {
      attachResourceClickListeners();
    }, 100);
  }

  if (role === "assistant" && messages.length >= 2) {
    const userMessage = messages.find((msg) => msg.role === "user");
    const title =
      userMessage?.content?.substring(0, 50) +
      (userMessage?.content?.length > 50 ? "..." : "");

    const historyItem = {
      id: Date.now(),
      title: title || "Untitled Search",
      messages: [...messages],
      timestamp: new Date(),
    };

    const exists = history.findIndex((h) => h.id === historyItem.id);
    if (exists > -1) {
      history[exists] = historyItem;
    } else {
      history.unshift(historyItem);
    }

    localStorage.setItem("resourceFinder_history", JSON.stringify(history));
    renderHistory();
  }
}

function renderMessages() {
  const chatMessages = document.getElementById("chat-messages");
  chatMessages.innerHTML = "";

  messages.forEach((msg, index) => {
    const messageContainer = document.createElement("div");
    messageContainer.className = `message-container message-${msg.role}`;

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const timestamp = new Date(msg.timestamp);
    const timeStr = timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    meta.innerHTML =
      msg.role === "user"
        ? `<i class="fas fa-user"></i> You <span class="message-time">${timeStr}</span>`
        : `<i class="fas fa-people-group"></i> CommunityLink <span class="message-time">${timeStr}</span>`;

    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message chat-message-${msg.role}`;
    messageDiv.innerHTML = msg.content;

    if (msg.role === "user") {
      const actions = document.createElement("div");
      actions.className = "message-actions";

      const copyBtn = document.createElement("button");
      copyBtn.className = "message-action-btn";
      copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
      copyBtn.title = "Copy message";
      copyBtn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(msg.content);
        showToast("Message copied to clipboard", "success");
      };

      actions.appendChild(copyBtn);
      messageDiv.appendChild(actions);
    }

    if (msg.role === "assistant") {
      const feedbackDiv = document.createElement("div");
      feedbackDiv.className = "feedback-buttons";

      const likeBtn = document.createElement("button");
      likeBtn.className = "feedback-btn";
      likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Helpful';
      likeBtn.onclick = () => {
        if (likeBtn.classList.contains("liked")) {
          likeBtn.classList.remove("liked");
        } else {
          likeBtn.classList.add("liked");
          dislikeBtn.classList.remove("disliked");
          showToast("Thanks for your feedback!", "success");
        }
      };

      const dislikeBtn = document.createElement("button");
      dislikeBtn.className = "feedback-btn";
      dislikeBtn.innerHTML = '<i class="fas fa-thumbs-down"></i> Not helpful';
      dislikeBtn.onclick = () => {
        if (dislikeBtn.classList.contains("disliked")) {
          dislikeBtn.classList.remove("disliked");
        } else {
          dislikeBtn.classList.add("disliked");
          likeBtn.classList.remove("liked");
          const reason = prompt("What was not helpful about this response?");
          if (reason) {
            showToast("Thanks for your feedback!", "success");
          }
        }
      };

      feedbackDiv.appendChild(likeBtn);
      feedbackDiv.appendChild(dislikeBtn);
      messageContainer.appendChild(feedbackDiv);
    }

    messageContainer.appendChild(meta);
    messageContainer.appendChild(messageDiv);
    chatMessages.appendChild(messageContainer);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderHistory() {
  const historyDiv = document.getElementById("history");
  historyDiv.innerHTML = "";

  history.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.dataset.index = index;

    const date = new Date(item.timestamp);
    const formattedDate =
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    div.innerHTML = `
      <i class="fas fa-search"></i>
      <div>
        <span>${item.title.substring(0, 30)}${
          item.title.length > 30 ? "..." : ""
        }</span>
        <span class="history-date">${formattedDate}</span>
      </div>
    `;
    historyDiv.appendChild(div);
  });
}

function formatResponse(response) {
  // Format for directory listings with multiple organizations
  if (response.includes("community resources") || response.includes("Resources in")) {
    // First, clean up any potential HTML that might be in the original response
    let cleanedText = response.replace(/<[^>]*>/g, "");

    // Start building the formatted response with proper structure
    let formattedResponse = `<div class="resource-response">`;

    // Extract city name/topic for the header
    const cityMatch = cleanedText.match(/Resources in ([^\.]+)/i) ||
                      cleanedText.match(/Community resources in ([^\.]+)/i);
    const searchTopic = cityMatch ? cityMatch[1].trim() : "your area";

    // Add the header with improved styling
    formattedResponse += `
      <div class="resource-response-header">
        <i class="fas fa-hands-helping"></i>
        <span>Community Resources in ${searchTopic}</span>
      </div>
    `;

    // Add the intro section if available
    if (cleanedText.includes("I found the following")) {
      const introText = cleanedText.split("I found the following")[0].trim();
      formattedResponse += `<div class="resource-intro">${introText}</div>`;
    }

    // Add the main section title
    formattedResponse += `<h3 class="resource-section-title">Available Resources</h3>`;

    // Start the organizations container
    formattedResponse += `<div class="resource-list-container">`;

    // Split the text by double newlines to separate organizations
    const parts = cleanedText.split("\n\n");
    let orgStarted = false;
    let currentOrg = "";

    // Process each part to identify organizations and their resources
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();

      // Skip empty parts, headers, and footers
      if (!part ||
          part.includes("I found the following") ||
          part.includes("Would you like to") ||
          part.includes("Sources:")) {
        continue;
      }

      // Check if this is an organization name (doesn't have a colon and is relatively short)
      if (!part.includes(":") && part.length < 60 && !part.startsWith("-")) {
        if (orgStarted) {
          // Close previous org section
          formattedResponse += `</div></div>`;
        }

        orgStarted = true;
        currentOrg = part;
        formattedResponse += `
          <div class="organization-section">
            <div class="organization-name"><i class="fas fa-building"></i> ${part}</div>
            <div class="resource-list">
        `;
      }
      // Check if this contains info about current org
      else if (orgStarted && (part.includes(":") || part.split("\n").length > 1)) {
        const lines = part.split("\n");

        // Create more visually distinct resource items
        lines.forEach(line => {
          if (line.trim()) {
            // Use appropriate icons for different resource types
            if (line.toLowerCase().includes("address:")) {
              formattedResponse += `
                <div class="resource-in-results">
                  <i class="fas fa-map-marker-alt" style="margin-right: 8px; color: #4CAF50;"></i> ${line.trim()}
                </div>`;
            } else if (line.toLowerCase().includes("phone:")) {
              formattedResponse += `
                <div class="resource-in-results">
                  <i class="fas fa-phone" style="margin-right: 8px; color: #4CAF50;"></i> ${line.trim()}
                </div>`;
            } else if (line.toLowerCase().includes("hours:")) {
              formattedResponse += `
                <div class="resource-in-results">
                  <i class="fas fa-clock" style="margin-right: 8px; color: #4CAF50;"></i> ${line.trim()}
                </div>`;
            } else if (line.toLowerCase().includes("website:")) {
              formattedResponse += `
                <div class="resource-in-results">
                  <i class="fas fa-globe" style="margin-right: 8px; color: #4CAF50;"></i> ${line.trim()}
                </div>`;
            } else if (line.toLowerCase().includes("service:") || line.startsWith("-")) {
              formattedResponse += `
                <div class="resource-in-results">
                  <i class="fas fa-hands-helping" style="margin-right: 8px; color: #4CAF50;"></i> ${line.replace(/^-\s*/, "").trim()}
                </div>`;
            } else {
              // Other info about the organization
              formattedResponse += `<p>${line.trim()}</p>`;
            }
          }
        });
      }
    }

    // Close any remaining open organization section
    if (orgStarted) {
      formattedResponse += `</div></div>`;
    }

    // Add the footer section with a slightly different style
    formattedResponse += `
      <div class="resource-response-footer">
        <i class="fas fa-question-circle" style="margin-right: 8px;"></i>
        Would you like more information about any specific resource?
      </div>`;

    // Add sources if any
    if (cleanedText.includes("Sources:")) {
      const sourcesText = cleanedText.split("Sources:")[1]?.trim() || "";
      formattedResponse += `<div class="resource-sources">Sources: ${sourcesText}</div>`;
    }

    // Close the container
    formattedResponse += `</div>`;

    return formattedResponse;
  }

  // For individual resource responses (not directory listings)
  // Use a nicer card layout for single resources
  if (response.includes("Type:") && response.includes("Services:") && !response.includes("Resources in")) {
    const sections = response.split("\n\n");
    let resourceName = sections[0].trim();

    // Create a nicely formatted card for the resource
    let formattedResponse = `
      <div class="resource-real-data">
        <div class="resource-header">
          <h3>${resourceName}</h3>
          <div class="resource-meta-info">
    `;

    // Extract and format metadata fields (Type, Location, Phone, Hours, Website)
    const metadataSection = sections[1] ? sections[1].split("\n") : [];
    let categories = [];

    metadataSection.forEach(line => {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(":").trim();

        let icon = "fa-info-circle";
        if (key.toLowerCase() === "type") {
          icon = "fa-bookmark";
          categories.push(value);
        } else if (key.toLowerCase() === "location") icon = "fa-map-marker-alt";
        else if (key.toLowerCase() === "phone") icon = "fa-phone";
        else if (key.toLowerCase() === "hours") icon = "fa-clock";
        else if (key.toLowerCase() === "website") icon = "fa-globe";

        formattedResponse += `
          <div class="resource-meta-item">
            <i class="fas ${icon}" style="color: #4CAF50; margin-right: 8px;"></i>
            <span><strong>${key}:</strong> ${value}</span>
          </div>
        `;
      }
    });

    formattedResponse += `</div>`; // Close resource-meta-info

    // Add categories as tags
    if (categories.length > 0) {
      formattedResponse += `<div class="resource-categories-list">`;
      categories.forEach(category => {
        formattedResponse += `<span class="category-tag">${category}</span>`;
      });
      formattedResponse += `</div>`;
    }

    // Process services section
    let servicesSection = sections.find(section => section.trim().startsWith("Services:"));
    if (servicesSection) {
      formattedResponse += `
        <div class="resource-section">
          <h4><i class="fas fa-hands-helping" style="margin-right: 8px;"></i>Services</h4>
      `;

      const serviceLines = servicesSection.split("\n").slice(1);
      if (serviceLines.length > 0) {
        formattedResponse += `<ul class="resource-service-list">`;
        serviceLines.forEach(service => {
          if (service.trim()) {
            formattedResponse += `<li>✨ ${service.replace(/^-\s*/, "").trim()}</li>`;
          }
        });
        formattedResponse += `</ul>`;
      }

      formattedResponse += `</div>`;
    }

    // Process eligibility section
    let eligibilitySection = sections.find(section => section.trim().startsWith("Eligibility:"));
    if (eligibilitySection) {
      formattedResponse += `
        <div class="resource-section">
          <h4><i class="fas fa-check-circle" style="margin-right: 8px;"></i>Eligibility</h4>
          <p>${eligibilitySection.split("\n").slice(1).join(" ").trim()}</p>
        </div>
      `;
    }

    // Process additional information section
    let additionalSection = sections.find(section => section.trim().startsWith("Additional Information:"));
    if (additionalSection) {
      formattedResponse += `
        <div class="resource-section">
          <h4><i class="fas fa-info-circle" style="margin-right: 8px;"></i>Additional Information</h4>
          <p>${additionalSection.split("\n").slice(1).join(" ").trim()}</p>
        </div>
      `;
    }

    formattedResponse += `</div>`; // Close resource-real-data div

    return formattedResponse;
  }

  // For regular (non-directory) responses that don't match the specific format above
  const iconMap = {
    "resource center": "📍",
    "community center": "🏢",
    "food bank": "🍲",
    "pantry": "🥫",
    "shelter": "🏠",
    "housing": "🏘️",
    "healthcare": "⚕️",
    "clinic": "🩺",
    "medical": "🏥",
    "mental health": "🧠",
    "counseling": "💬",
    "therapy": "🛋️",
    "education": "📚",
    "school": "🎓",
    "training": "🔧",
    "employment": "💼",
    "job": "👔",
    "legal": "⚖️",
    "aid": "🆘",
    "financial": "💰",
    "assistance": "🤲",
    "support": "🤝",
    "hours": "🕒",
    "contact": "📞",
    "eligibility": "✅",
    "children": "👶",
    "youth": "🧒",
    "senior": "👵",
    "adult": "👨",
    "family": "👪",
    "disability": "♿",
    "veteran": "🎖️",
    "immigrant": "🌍",
    "emergency": "🚨",
    "crisis": "🆘",
  };

  const sections = response.split("\n\n");
  let formattedResponse = `<div class="resource-response-content">`;

  sections.forEach((section, index) => {
    if (section.trim()) {
      const lines = section.split("\n").filter((line) => line.trim());
      let heading = lines[0];

      // Format the heading with a nice style
      formattedResponse += `<div class="resource-section">`;
      formattedResponse += `<h4 class="resource-section-heading">${heading.trim()}</h4>`;

      if (index === 0) {
        // Introductory paragraph gets special formatting
        formattedResponse += `<p class="resource-intro-text">${lines.slice(1).join(" ")}</p>`;
      }
      else if (section.toLowerCase().includes("resources available")) {
        // Format resources as clickable items with improved styling
        formattedResponse += '<div class="resource-list" style="margin-top: 10px;">';
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const resourceName = lines[i].replace(/^-\s*/, "").trim();
            formattedResponse += `
              <div class="resource-in-results" style="margin: 8px 0; padding: 10px 15px;">
                <i class="fas fa-chevron-right" style="margin-right: 10px; color: #4CAF50;"></i>
                ${resourceName}
              </div>`;
          }
        }
        formattedResponse += '</div>';
      }
      else if (section.toLowerCase().includes("services")) {
        formattedResponse += '<div class="services-list" style="margin-top: 10px;">';
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const itemText = lines[i].replace(/^-\s*/, "").trim();
            formattedResponse += `
              <div class="service-item" style="margin: 8px 0;">
                <i class="fas fa-star" style="color: #4CAF50; margin-right: 8px;"></i>
                ${itemText}
              </div>`;
          }
        }
        formattedResponse += '</div>';
      }
      else {
        // General list formatting with appropriate icons
        formattedResponse += "<ul style='padding-left: 10px; margin-top: 10px;'>";
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const itemText = lines[i].replace(/^-\s*/, "").trim();
            const itemLower = itemText.toLowerCase();
            let itemIcon = "📌";

            // Find matching icon
            for (const [key, icon] of Object.entries(iconMap)) {
              if (itemLower.includes(key)) {
                itemIcon = icon;
                break;
              }
            }

            formattedResponse += `<li style="margin-bottom: 8px; list-style-type: none;"><span style="margin-right: 10px;">${itemIcon}</span> ${itemText}</li>`;
          }
        }
        formattedResponse += "</ul>";
      }
      formattedResponse += "</div>";
    }
  });

  formattedResponse += "</div>";
  return formattedResponse;
}

function hideEmptyState() {
  const emptyState = document.getElementById("empty-state");
  if (emptyState) {
    emptyState.style.display = "none";
  }
}

function showEmptyState() {
  const emptyState = document.getElementById("empty-state");
  const chatMessages = document.getElementById("chat-messages");

  if (emptyState) {
    chatMessages.innerHTML = "";
    emptyState.style.display = "flex";
    chatMessages.appendChild(emptyState);
  } else {
    // Create empty state if it doesn't exist
    const newEmptyState = document.createElement("div");
    newEmptyState.id = "empty-state";
    newEmptyState.className = "empty-state";
    newEmptyState.innerHTML = `
      <div class="empty-icon">
        <i class="fas fa-people-group"></i>
      </div>
      <h2>Welcome to CommunityLink</h2>
      <p>Your AI-powered community resource directory</p>
      <div class="feature-list">
        <div class="feature-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>Find resources in your community</span>
        </div>
        <div class="feature-item">
          <i class="fas fa-info-circle"></i>
          <span>Get service information</span>
        </div>
        <div class="feature-item">
          <i class="fas fa-clock"></i>
          <span>Check operating hours</span>
        </div>
        <div class="feature-item">
          <i class="fas fa-exchange-alt"></i>
          <span>Compare services</span>
        </div>
      </div>
      <p class="start-prompt">Type a city name to find resources near you!</p>
    `;
    chatMessages.innerHTML = "";
    chatMessages.appendChild(newEmptyState);
  }
}

async function getResourceResponse(userInput) {
  const inputLower = userInput.toLowerCase();
  // Check if the input likely contains a location or resource request
  if (!ALLOWED_KEYWORDS.some((keyword) => inputLower.includes(keyword))) {
    addMessage(
      "assistant",
      "⚠️ I specialize in community resource information. Please ask about resources, services, or community support (e.g., 'Food banks in Boston' or 'Mental health services for teens')."
    );
    return;
  }

  // Add typing indicator
  const chatMessages = document.getElementById("chat-messages");
  const typingIndicator = document.createElement("div");
  typingIndicator.className = "typing";
  typingIndicator.innerHTML = "<span></span><span></span><span></span>";
  chatMessages.appendChild(typingIndicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    // Determine query type - resource directory or specific resource details
    const isCitySearch = inputLower.match(/resources?\s+in\s+([a-z\s]+)/i) ||
                      inputLower.match(/services?\s+in\s+([a-z\s]+)/i) ||
                      inputLower.match(/community\s+support\s+in\s+([a-z\s]+)/i);

    const isResourceTypeSearch = inputLower.includes("food bank") ||
                              inputLower.includes("shelter") ||
                              inputLower.includes("healthcare") ||
                              inputLower.includes("mental health") ||
                              inputLower.includes("legal aid");

    let prompt;

    if (isCitySearch || isResourceTypeSearch) {
      // Directory listing format
      prompt = `
        You are ResourceFinder, an AI assistant helping users find community resources.
        The user asked about: ${userInput}

        Follow these steps precisely:
        1. Acknowledge the request and mention searching for resources.
        2. List 5-7 relevant community organizations/resources that could help with this need.
        3. For each organization, include:
           - Organization name as a clear heading
           - Brief description (1 sentence)
           - Services offered (2-3 key services)
           - Address (create a realistic one if you don't know)
           - Contact information (phone and/or website)
           - Hours of operation (typical business hours)
        4. After listing all resources, conclude with: "Would you like more specific information about any of these resources?"
        5. Add a final line: "Sources: Community resource database"

        Format each organization with its name on its own line, followed by information indented or prefixed with appropriate labels.
        Ensure information is realistic, helpful, and organized clearly.
      `;
    } else {
      // Specific resource details format
      prompt = `
        You are ResourceFinder, an AI assistant specializing in community resource information.
        The user is asking about: "${userInput}"

        Provide detailed information about this resource or service in the following format:

        [Resource/Service Name]

        Type: [Type of resource/service]
        Location: [Address or service area]
        Phone: [Phone number]
        Hours: [Operating hours]
        Website: [Website if applicable]

        Services:
        [List 3-5 main services offered]

        Eligibility:
        [Who can access this resource and any requirements]

        Additional Information:
        [Any other relevant details like cost, accessibility, languages supported]

        Use plain text with appropriate line breaks. Be factually accurate but create realistic details if needed. If the resource request is unclear, provide information about the most relevant type of community support service that matches the query.
      `;
    }

    const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.5,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    // Remove typing indicator
    if (typingIndicator.parentNode === chatMessages) {
      chatMessages.removeChild(typingIndicator);
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error Response:", errorData);
      throw new Error(`API request failed with status ${response.status}: ${errorData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
      const rawText = data.candidates[0].content.parts[0].text;

      if (data.candidates[0].finishReason === "SAFETY") {
        addMessage(
          "assistant",
          "I couldn't retrieve the resource information due to content restrictions. Please try a different search."
        );
        showToast("Response blocked for safety reasons", "warning");
      } else {
        // Use our formatResponse function
        addMessage("assistant", formatResponse(rawText));
      }
    } else if (data.promptFeedback && data.promptFeedback.blockReason) {
      console.error("Prompt Feedback:", data.promptFeedback);
      addMessage(
        "assistant",
        `Your request could not be processed due to: ${data.promptFeedback.blockReason}. Please rephrase your request.`
      );
      showToast("Request blocked", "warning");
    } else {
      console.error("Unexpected API response structure:", data);
      throw new Error("Received an unexpected response format from the API.");
    }
  } catch (error) {
    // Remove typing indicator if still present
    if (typingIndicator.parentNode === chatMessages) {
      chatMessages.removeChild(typingIndicator);
    }
    console.error("Error fetching response:", error);
    addMessage(
      "assistant",
      `Sorry, I encountered an error trying to find resource information: ${error.message}. Please try again later.`
    );
    showToast("Error getting resource information", "error");
  }
}

async function compareResources(resourceA, resourceB) {
  // Add user message showing the comparison request
  const comparisonMessage = `Compare ${resourceA} vs ${resourceB}`;
  addMessage("user", comparisonMessage);

  // Add typing indicator
  const chatMessages = document.getElementById("chat-messages");
  const typingIndicator = document.createElement("div");
  typingIndicator.className = "typing";
  typingIndicator.innerHTML = "<span></span><span></span><span></span>";
  chatMessages.appendChild(typingIndicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `As ResourceFinder, compare these two community resources: ${resourceA} and ${resourceB}.
                  Create a detailed comparison with the following categories:
                  - Overview: A brief introduction comparing the two resources (1-2 sentences)
                  - Services: Main services offered by each
                  - Location: The location and accessibility
                  - Hours: Operating hours comparison
                  - Eligibility: Who can access each resource
                  - Cost: Any fees or whether services are free
                  - Advantages of ${resourceA}: List 3 main advantages
                  - Disadvantages of ${resourceA}: List key disadvantages
                  - Advantages of ${resourceB}: List 3 main advantages
                  - Disadvantages of ${resourceB}: List key disadvantages
                  - Best For: Which resource is better for which situations or needs
                  Format each category on separate lines starting with the category name, then colon, then the details.
                  Keep each point concise but informative. Create realistic details if needed.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    // Remove typing indicator
    chatMessages.removeChild(typingIndicator);

    const data = await response.json();
    if (data.candidates && data.candidates[0].content) {
      const comparisonText = data.candidates[0].content.parts[0].text;

      // Format response as table
      const formattedResponse = formatComparisonAsTable(
        comparisonText,
        resourceA,
        resourceB
      );
      addMessage("assistant", formattedResponse);
    } else {
      throw new Error("No response from API");
    }
  } catch (error) {
    // Remove typing indicator if still present
    if (typingIndicator.parentNode === chatMessages) {
      chatMessages.removeChild(typingIndicator);
    }

    addMessage(
      "assistant",
      `Error comparing resources: ${error.message}. Please try again.`
    );
    showToast("Error comparing resources", "error");
  }
}

function formatComparisonAsTable(text, resourceA, resourceB) {
  // Parse the text into sections
  const sections = {};
  let currentSection = "";

  // Split by lines and process each line
  const lines = text.split("\n");
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check if this is a new section header
    const sectionMatch = line.match(/^([^:]+):\s*(.*)/);

    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      sections[currentSection] = sectionMatch[2].trim();
    } else if (currentSection) {
      // Append to current section
      sections[currentSection] = sections[currentSection]
        ? sections[currentSection] + " " + line
        : line;
    }
  }
  let tableHtml = `
    <div class="comparison-result">
      <h3>Comparison: ${resourceA} vs ${resourceB}</h3>
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Process each section
  const orderedSections = [
    "Overview",
    "Services",
    "Location",
    "Hours",
    "Eligibility",
    "Cost",
    `Advantages of ${resourceA}`,
    `Disadvantages of ${resourceA}`,
    `Advantages of ${resourceB}`,
    `Disadvantages of ${resourceB}`,
    "Best For",
  ];
  for (const sectionName of orderedSections) {
    if (sections[sectionName]) {
      tableHtml += `
        <tr>
          <td class="category">${sectionName}</td>
          <td>${formatComparisonDetails(
            sections[sectionName],
            sectionName
          )}</td>
        </tr>
      `;
    }
  }

  // Check for verdict or best for section
  const verdictSection =
    sections["Best For"] ||
    sections["Verdict"] ||
    sections["Recommendation"] ||
    "";
  if (verdictSection) {
    tableHtml += `
      <tr class="verdict">
        <td class="category">Verdict</td>
        <td>${verdictSection}</td>
      </tr>
    `;
  }
  tableHtml += `
        </tbody>
      </table>
    </div>
  `;

  return tableHtml;
}

function formatComparisonDetails(text, sectionName) {
  if (sectionName.includes("Advantages")) {
    // Format advantages with checkmarks
    const points = text.split(/[.•]/);
    let formatted = '<ul class="pros-list">';
    for (const point of points) {
      const trimmed = point.trim();
      if (trimmed) {
        formatted += `<li>✅ ${trimmed}</li>`;
      }
    }
    formatted += "</ul>";
    return formatted;
  } else if (sectionName.includes("Disadvantages")) {
    // Format disadvantages with X marks
    const points = text.split(/[.•]/);
    let formatted = '<ul class="cons-list">';
    for (const point of points) {
      const trimmed = point.trim();
      if (trimmed) {
        formatted += `<li>❌ ${trimmed}</li>`;
      }
    }
    formatted += "</ul>";
    return formatted;
  } else {
    // Regular formatting for other sections
    return text.replace(/\n/g, "<br>");
  }
}

function sendMessage() {
  const userInput = document.getElementById("user-input");
  const content = userInput.value.trim();

  if (content) {
    // If content contains "compare" and "vs", process as comparison
    if (
      content.toLowerCase().includes("compare") &&
      (content.toLowerCase().includes(" vs ") ||
        content.toLowerCase().includes("versus"))
    ) {
      // Extract the two resources being compared
      let resources = content.split(/vs|versus/i);

      if (resources.length >= 2) {
        const resourceA = resources[0]
          .replace(/compare|which is better|between/gi, "")
          .trim();
        const resourceB = resources[1].trim();

        if (resourceA && resourceB) {
          addMessage("user", content);
          compareResources(resourceA, resourceB);
          userInput.value = "";
          return;
        }
      }
    }

    // Process as normal resource request
    addMessage("user", content);
    getResourceResponse(content);
    userInput.value = "";
  }
}

function showToast(message, type = "info") {
  // Remove any existing toast
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  // Create new toast
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let icon = "";
  switch (type) {
    case "success":
      icon = '<i class="fas fa-check-circle"></i>';
      break;
    case "error":
      icon = '<i class="fas fa-times-circle"></i>';
      break;
    default:
      icon = '<i class="fas fa-info-circle"></i>';
  }

  toast.innerHTML = `${icon} ${message}`;
  document.body.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    if (toast.parentNode === document.body) {
      document.body.removeChild(toast);
    }
  }, 3000);
}

function exportChat() {
  if (messages.length === 0) {
    showToast("No resource data to export", "error");
    return;
  }

  let exportText = "CommunityLink Search Results\n";
  exportText += "===========================\n\n";

  messages.forEach((msg) => {
    const role = msg.role === "user" ? "You" : "CommunityLink";
    const time = new Date(msg.timestamp).toLocaleString();
    const content = msg.content.replace(/<[^>]*>?/gm, ""); // Remove HTML tags

    exportText += `[${time}] ${role}:\n`;
    exportText += `${content}\n\n`;
  });

  // Create blob and download
  const blob = new Blob([exportText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  a.href = url;
  a.download = `CommunityLink_Results_${date}.txt`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Resource data exported successfully", "success");
}

function loadHistory() {
  const savedHistory = localStorage.getItem("communityLink_history");
  if (savedHistory) {
    try {
      history = JSON.parse(savedHistory);
      renderHistory();
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }
}
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => showToast("Copied to clipboard", "success"),
    () => showToast("Failed to copy", "error")
  );
}

async function showResourceDetails(resourceName, organizationName = "") {
  // Show loading state in modal
  document.getElementById("resource-title").textContent = resourceName;
  document.getElementById("resource-image").src =
    "https://via.placeholder.com/200x200?text=Loading...";
  document.getElementById("resource-type").innerHTML =
    '<i class="fas fa-question-circle"></i> Loading...';
  document.getElementById("resource-hours").innerHTML =
    '<i class="fas fa-clock"></i> Loading...';
  document.getElementById("resource-phone").innerHTML =
    '<i class="fas fa-phone"></i> Loading...';
  document.getElementById("resource-categories").innerHTML = "";
  document.getElementById("resource-description").textContent =
    "Loading resource information...";
  document.getElementById("resource-services-list").textContent = "Loading...";
  document.getElementById("resource-eligibility-info").textContent = "Loading...";

  // Show the modal
  document.getElementById("resource-modal").classList.add("active");

  try {
    // Get resource details from API
    const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `As ResourceFinder, provide detailed information about the community resource "${resourceName}"${
                  organizationName ? ` from ${organizationName}` : ""
                } in JSON format with these fields:
                name: full resource name
                org: parent organization name if applicable
                type: type of resource (e.g. "Food Bank", "Mental Health Services")
                address: full address
                phone: phone number
                hours: operating hours
                website: website URL if applicable
                description: brief description of what they do (2-3 sentences)
                services: array of 3-5 main services offered
                eligibility: who can use this resource and any requirements
                categories: array of 2-4 categories this resource falls under (e.g. "Food", "Housing", "Healthcare")

                Format your response as valid JSON only with no additional text. Create realistic details if needed.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content) {
      const rawText = data.candidates[0].content.parts[0].text;

      // Extract the JSON part from the response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const resourceData = JSON.parse(jsonMatch[0]);

          // Fill in the modal with resource data
          document.getElementById("resource-title").textContent =
            resourceData.name || resourceName;

          document.getElementById("resource-type").innerHTML =
            `<i class="fas fa-bookmark"></i> ${resourceData.type || "Community Resource"}`;

          document.getElementById("resource-hours").innerHTML =
            `<i class="fas fa-clock"></i> ${resourceData.hours || "Hours vary"}`;

          document.getElementById("resource-phone").innerHTML =
            `<i class="fas fa-phone"></i> ${resourceData.phone || "No phone listed"}`;

          // Store full phone for dialing
          document.getElementById("resource-phone").dataset.phone =
            resourceData.phone?.replace(/\D/g, '') || "";

          // Create resource categories as tags
          const categoriesContainer = document.getElementById("resource-categories");
          categoriesContainer.innerHTML = "";
          if (resourceData.categories && resourceData.categories.length) {
            resourceData.categories.forEach((category) => {
              const categoryTag = document.createElement("span");
              categoryTag.className = "category-tag";
              categoryTag.textContent = category;
              categoriesContainer.appendChild(categoryTag);
            });
          }

          document.getElementById("resource-description").textContent =
            resourceData.description || "No description available.";

          document.getElementById("resource-services-list").textContent =
            resourceData.services ? resourceData.services.join(", ") : "Services information not available.";

          document.getElementById("resource-eligibility-info").textContent =
            resourceData.eligibility || "Eligibility information not available.";

          // Store address for directions
          const hiddenAddress = document.createElement("div");
          hiddenAddress.id = "resource-address";
          hiddenAddress.style.display = "none";
          hiddenAddress.textContent = resourceData.address || "";
          document.querySelector(".resource-info").appendChild(hiddenAddress);

          // Use a placeholder image
          document.getElementById("resource-image").src =
            `https://via.placeholder.com/200x200?text=${encodeURIComponent(
              resourceData.name?.substring(0, 10) || "Resource"
            )}`;

          return;
        } catch (jsonError) {
          console.error("Error parsing resource JSON:", jsonError);
          showErrorInResourceModal("Could not parse resource information.");
        }
      } else {
        showErrorInResourceModal(
          "Could not retrieve resource information in the right format."
        );
      }
    } else {
      showErrorInResourceModal("No resource information found.");
    }
  } catch (error) {
    console.error("Error fetching resource details:", error);
    showErrorInResourceModal(
      "Error retrieving resource information. Please try again later."
    );
  }
}

function showErrorInResourceModal(message) {
  document.getElementById("resource-image").src =
    "https://via.placeholder.com/200x200?text=Not+Found";
  document.getElementById("resource-type").innerHTML =
    '<i class="fas fa-question-circle"></i> N/A';
  document.getElementById("resource-hours").innerHTML =
    '<i class="fas fa-clock"></i> N/A';
  document.getElementById("resource-phone").innerHTML =
    '<i class="fas fa-phone"></i> N/A';
  document.getElementById("resource-categories").innerHTML = "";
  document.getElementById("resource-description").textContent = message;
  document.getElementById("resource-services-list").textContent = "Not available";
  document.getElementById("resource-eligibility-info").textContent = "Not available";
}

// Add keyboard support for modal
document.addEventListener("DOMContentLoaded", () => {
  const productA = document.getElementById("product-a");
  const productB = document.getElementById("product-b");
  const compareSubmit = document.getElementById("compare-submit");
  const compareModal = document.getElementById("compare-modal");

  if (productA && productB) {
    productA.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        productB.focus();
      } else if (e.key === "Escape") {
        compareModal.classList.remove("active");
      }
    });

    productB.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        compareSubmit.click();
      } else if (e.key === "Escape") {
        compareModal.classList.remove("active");
      }
    });
  }

  // Add event listener for Escape key to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (compareModal.classList.contains("active")) {
        compareModal.classList.remove("active");
      }

      const resourceModal = document.getElementById("resource-modal");
      if (resourceModal.classList.contains("active")) {
        resourceModal.classList.remove("active");
      }
    }
  });
});